from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete # delete もインポートして、より明示的に削除を行うことも可能
from typing import Optional # 型ヒントの充実
from fastapi import HTTPException
from . import models, schemas # models は DB スキーマ、schemas は Pydantic スキーマを想定
from passlib.context import CryptContext

# ----------------------------------------------------------------------
# パスワードハッシュ化の設定
# ----------------------------------------------------------------------

# CryptContext: パスワードのハッシュ化と検証を行うコンテキスト
# schemes=["bcrypt"]: bcryptアルゴリズムを使用（セキュアなパスワードハッシュ化）
# deprecated="auto": 非推奨のハッシュ方式を自動的に検出・警告
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def get_user_by_email(db: AsyncSession, email: str) -> Optional[models.User]:
    """
    メールアドレスでユーザーを検索する関数
    
    Args:
        db: データベースセッション
        email: 検索するメールアドレス
    
    Returns:
        見つかったユーザーオブジェクト、またはNone（見つからない場合）
    """
    # SELECT * FROM users WHERE email = :email のクエリを実行
    result = await db.execute(select(models.User).where(models.User.email == email))
    # 結果から1件のオブジェクトを取得（0件または1件の場合に対応）
    return result.scalar_one_or_none()

async def create_user(db: AsyncSession, user: schemas.UserCreate) -> models.User:
    """
    新しいユーザーを作成する関数
    
    パスワードは自動的にハッシュ化されてデータベースに保存されます。
    
    Args:
        db: データベースセッション
        user: ユーザー作成用のスキーマ（メールアドレスとパスワード）
    
    Returns:
        作成されたユーザーオブジェクト（DBに保存済み）
    
    Raises:
        HTTPException: パスワードのハッシュ化に失敗した場合（400 Bad Request）
    """
    try:
        # パスワードをbcryptでハッシュ化
        # ハッシュ化されたパスワードは元のパスワードから復元できない
        hashed_password = pwd_context.hash(user.password)
    except ValueError as e:
        # bcryptの制限（72バイトを超えるパスワード）やその他のハッシュ化エラー
        raise HTTPException(status_code=400, detail=str(e))
    
    # ユーザーモデルのインスタンスを作成
    db_user = models.User(email=user.email, hashed_password=hashed_password)
    
    # セッションに追加（INSERT操作）
    db.add(db_user)
    
    # データベースにコミット（実際に保存される）
    await db.commit()
    
    # データベースから最新の情報を再読み込み（自動生成されたIDなどを取得）
    await db.refresh(db_user)
    
    return db_user

async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[models.User]:
    """
    ユーザーの認証を行う関数
    
    メールアドレスとパスワードを受け取り、データベースに存在するユーザーかどうかを確認します。
    パスワードはハッシュ化されたものと比較されます。
    
    Args:
        db: データベースセッション
        email: 認証するメールアドレス
        password: 認証するパスワード（平文）
    
    Returns:
        認証が成功した場合はユーザーオブジェクト、失敗した場合はNone
    """
    # メールアドレスでユーザーを検索
    user = await get_user_by_email(db, email=email)
    
    # ユーザーが存在しない場合は認証失敗
    if not user:
        return None
    
    # 入力されたパスワード（平文）とデータベースに保存されたハッシュ化されたパスワードを比較
    # verify関数は自動的にハッシュを比較して、一致するかどうかを返す
    if not pwd_context.verify(password, user.hashed_password):
        # パスワードが一致しない場合は認証失敗
        return None
    
    # 認証成功: ユーザーオブジェクトを返す
    return user

# Todo リストを取得する
async def get_todos(db: AsyncSession, owner_id: int) -> list[models.Todo]:
    """
    データベースから全ての Todo アイテムを取得します。
    """
    # SELECT * FROM todos のクエリを作成し、非同期で実行
    # execute() は Result オブジェクトを返す
    result = await db.execute(
        select(models.Todo).where(models.Todo.owner_id == owner_id)
    )
    
    # scalars().all() で、Result オブジェクトから Todo オブジェクトのリストを抽出
    return result.scalars().all()

# 新しい Todo を作成する
async def create_todo(db: AsyncSession, todo: schemas.TodoCreate, owner_id: int) -> models.Todo:
    """
    新しい Todo アイテムを作成し、DB にコミットします。
    """
    # Pydantic モデル (schemas.TodoCreate) のデータを DB モデル (models.Todo) に展開してインスタンス化
    new_todo = models.Todo(**todo.model_dump(), owner_id=owner_id) # .dict() の代わりに .model_dump() を使用（Pydantic v2 推奨）
    
    # セッションに追加 (INSERT 操作)
    db.add(new_todo)
    
    # データベースへの変更を確定 (コミット)
    await db.commit()
    
    # データベースから最新の情報を再読み込み (主に ID やデフォルト値などを取得)
    await db.refresh(new_todo)
    
    # 作成された Todo オブジェクトを返す
    return new_todo

# Todo を ID で更新する
async def update_todo(db: AsyncSession, todo_id: int, todo: schemas.TodoUpdate, owner_id: int) -> Optional[models.Todo]:
    """
    指定された ID の Todo アイテムを更新します。
    更新対象のフィールドは Pydantic スキーマ (TodoUpdate) に含まれるもののみです。
    """
    # ID を条件に Todo アイテムを取得するクエリを実行
    # .where() で WHERE 句を指定
    result = await db.execute(
        select(models.Todo).where(
            models.Todo.id == todo_id, models.Todo.owner_id == owner_id
        )
    )
    
    # 結果から単一のオブジェクトを取得。存在しなければ None
    db_todo = result.scalar_one_or_none()
    
    # Todo が存在する場合のみ更新処理を実行
    if db_todo:
        # Pydantic モデルのデータを辞書として取得
        # .model_dump(exclude_unset=True) を使うと、ユーザーが設定しなかったフィールド（None ではなく未設定）を除外できる
        update_data = todo.model_dump(exclude_unset=True) 
        
        # 取得した辞書のキーと値を使って、DB オブジェクトの属性をループで更新
        for key, value in update_data.items():
            setattr(db_todo, key, value)
            
        # データベースへの変更を確定 (UPDATE 操作)
        await db.commit()
        
        # データベースから最新の情報を再読み込み
        await db.refresh(db_todo)
        
    # 更新された Todo オブジェクト、または None を返す
    return db_todo

# Todo を ID で削除する
async def delete_todo(db: AsyncSession, todo_id: int, owner_id: int) -> Optional[models.Todo]:
    """
    指定された ID の Todo アイテムを削除します。
    削除された Todo オブジェクトを返します。
    """
    # 削除対象の Todo を ID で取得
    result = await db.execute(
        select(models.Todo).where(
            models.Todo.id == todo_id, models.Todo.owner_id == owner_id
        )
    )
    db_todo = result.scalar_one_or_none()
    
    # Todo が存在する場合のみ削除処理を実行
    if db_todo:
        # セッションからオブジェクトを削除 (DELETE 操作)
        # SQLAlchemy 2.0では、インスタンスを削除するには db.delete() を使用します
        await db.delete(db_todo)
        
        # データベースへの変更を確定 (コミット)
        await db.commit()
        
    # 削除された Todo オブジェクト、または None を返す
    # (FastAPI の慣習として、削除したオブジェクトを返すことが多いため)
    return db_todo

# ---
# 🌟 (補足) 特定の ID の Todo を取得する関数を追加すると便利です
async def get_todo_by_id(db: AsyncSession, todo_id: int, owner_id: int) -> Optional[models.Todo]:
    """
    指定された ID の Todo アイテムを単体で取得します。
    """
    result = await db.execute(
        select(models.Todo).where(
            models.Todo.id == todo_id, models.Todo.owner_id == owner_id
        )
    )
    # scalar_one_or_none() を使用すると、結果が 0 または 1 個の場合にオブジェクトを返す
    return result.scalar_one_or_none()