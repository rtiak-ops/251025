# ==============================================================================
# インポートセクション
# ==============================================================================

from __future__ import annotations  # Python 3.10+: 型ヒントの前方参照を簡潔に

# PostgreSQL固有のエラー（UNIQUE制約違反など）を判定するため
import asyncpg.exceptions

# FastAPIのHTTPエラーレスポンス用
from fastapi import HTTPException
# パスワードのハッシュ化・検証用ライブラリ
from passlib.context import CryptContext
# SQLAlchemyのクエリ構築用（select: データ取得、delete: データ削除）
from sqlalchemy import delete, select
# データベース制約違反エラー（UNIQUE制約違反など）を捕捉するため
from sqlalchemy.exc import IntegrityError
# SQLAlchemyの非同期セッション管理用
from sqlalchemy.ext.asyncio import AsyncSession

# アプリケーション内のモデル（データベーステーブル定義）とスキーマ（データ検証）
from . import models, schemas 

# ==============================================================================
# パスワードハッシュ化の設定
# ==============================================================================
# bcryptアルゴリズムを使用してパスワードをハッシュ化します。
# - schemes=["bcrypt"]: bcryptハッシュアルゴリズムを使用
# - deprecated="auto": 古いハッシュ方式を自動的に非推奨として扱う
# これにより、パスワードを平文で保存せず、セキュアに管理できます。
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ==============================================================================
# ユーザー関連の CRUD 操作
# ==============================================================================
# CRUD = Create（作成）、Read（読み取り）、Update（更新）、Delete（削除）
# ここではユーザーの登録、検索、認証に関する関数を定義します。

async def get_user_by_email(db: AsyncSession, email: str) -> models.User | None:
    """
    メールアドレスでユーザーを検索する関数
    
    引数:
        db: データベースセッション（非同期）
        email: 検索するメールアドレス
    
    戻り値:
        見つかった場合: models.User オブジェクト
        見つからない場合: None
    """
    # SELECT * FROM users WHERE email = ? というSQLクエリを実行
    result = await db.execute(select(models.User).where(models.User.email == email))
    # 結果が1件の場合はそのオブジェクトを、0件の場合はNoneを返す
    return result.scalar_one_or_none()

async def create_user(db: AsyncSession, user: schemas.UserCreate) -> models.User:
    """
    新しいユーザーを作成する関数（登録処理）
    
    引数:
        db: データベースセッション（非同期）
        user: ユーザー作成用のスキーマ（email, passwordを含む）
    
    戻り値:
        作成されたユーザーオブジェクト（models.User）
    
    例外:
        HTTPException(400): パスワードのハッシュ化に失敗した場合
        HTTPException(409): メールアドレスが既に登録されている場合
        HTTPException(500): その他のデータベース制約エラー
    
    処理の流れ:
        1. パスワードをbcryptでハッシュ化（セキュリティのため平文保存しない）
        2. ユーザーモデルのインスタンスを作成
        3. データベースセッションに追加
        4. コミット（実際にデータベースに保存）
        5. 重複エラーなどを捕捉して適切なHTTPエラーを返す
    """
    try:
        # 1. パスワードをbcryptでハッシュ化
        # 平文パスワードをハッシュ化することで、データベース漏洩時も安全性を保つ
        hashed_password = pwd_context.hash(user.password)
    except ValueError as e:
        # パスワードのハッシュ化エラー（例：パスワードが空など）
        raise HTTPException(status_code=400, detail=str(e))
    
    # 2. ユーザーモデルのインスタンスを作成
    # email と hashed_password を持つ User オブジェクトを生成
    db_user = models.User(email=user.email, hashed_password=hashed_password)
    
    # 3. セッションに追加（INSERT操作の準備）
    # この時点ではまだデータベースには保存されていない
    db.add(db_user)
    
    # 4. データベースにコミット（実際に保存を実行）
    # 重複エラーなどはここで発生する
    try:
        await db.commit()
    
    except IntegrityError as e:
        # データベース制約違反が発生した場合（UNIQUE制約など）
        # コミット失敗時はロールバックして変更を取り消す
        await db.rollback()
        
        # PostgreSQLのUNIQUE制約違反エラーかどうかを判定
        # メールアドレスの重複登録を検出
        if isinstance(e.orig, asyncpg.exceptions.UniqueViolationError) or 'duplicate key value violates unique constraint' in str(e):
             # UNIQUE制約違反の場合（メールアドレス重複）
             # HTTP 409 Conflict を返す（リソースの競合を示すステータスコード）
             raise HTTPException(
                 status_code=409, 
                 detail="このメールアドレスは既に登録されています。"
             )
        else:
             # その他の IntegrityError（外部キー制約違反など）
             raise HTTPException(
                 status_code=500, 
                 detail="データベース制約エラーが発生しました。"
             )
    
    # 5. データベースから最新の情報を再読み込み
    # データベースで自動生成されたID、タイムスタンプなどを取得
    await db.refresh(db_user)
    
    return db_user

async def authenticate_user(db: AsyncSession, email: str, password: str) -> models.User | None:
    """
    ユーザーの認証を行う関数（ログイン処理）
    
    引数:
        db: データベースセッション（非同期）
        email: ログインするメールアドレス
        password: ログインするパスワード（平文）
    
    戻り値:
        認証成功: models.User オブジェクト
        認証失敗: None（ユーザーが存在しない、またはパスワードが間違っている）
    
    処理の流れ:
        1. メールアドレスでユーザーを検索
        2. ユーザーが存在しない場合は None を返す
        3. パスワードを検証（入力された平文パスワードとハッシュ化されたパスワードを比較）
        4. パスワードが一致しない場合は None を返す
        5. 全て成功した場合はユーザーオブジェクトを返す
    """
    # 1. メールアドレスでユーザーを検索
    user = await get_user_by_email(db, email=email)
    
    # 2. ユーザーが存在しない場合は認証失敗
    if not user:
        return None
    
    # 3. パスワードを検証
    # pwd_context.verify() は平文パスワードとハッシュ化されたパスワードを比較
    # 一致すればTrue、一致しなければFalseを返す
    if not pwd_context.verify(password, user.hashed_password):
        return None
    
    # 4. 認証成功：ユーザーオブジェクトを返す
    return user

# ==============================================================================
# Todo 関連の CRUD 操作
# ==============================================================================
# Todoアイテムの作成、読み取り、更新、削除、並び替えに関する関数を定義します。
# 各Todoは特定のユーザー（owner_id）に紐づいています。

async def get_todos(db: AsyncSession, owner_id: int) -> list[models.Todo]:
    """
    特定ユーザーの全てのTodoアイテムを取得する関数
    
    引数:
        db: データベースセッション（非同期）
        owner_id: Todoの所有者（ユーザー）のID
    
    戻り値:
        Todoアイテムのリスト（order カラムの昇順でソート済み）
    
    処理:
        - owner_id が一致する Todo を全て取得
        - order カラムで並び替え（ドラッグ&ドロップの順序を保持）
    """
    # SELECT * FROM todos WHERE owner_id = ? ORDER BY order ASC
    result = await db.execute(
        select(models.Todo).where(models.Todo.owner_id == owner_id).order_by(models.Todo.order)
    )
    # 全ての結果をリストとして返す
    return result.scalars().all()

async def create_todo(db: AsyncSession, todo: schemas.TodoCreate, owner_id: int) -> models.Todo:
    """
    新しいTodoアイテムを作成する関数
    
    引数:
        db: データベースセッション（非同期）
        todo: Todo作成用のスキーマ（title, description, completedなどを含む）
        owner_id: Todoの所有者（ユーザー）のID
    
    戻り値:
        作成されたTodoオブジェクト（models.Todo）
    
    処理の流れ:
        1. スキーマから辞書データを取得し、owner_idを追加してTodoモデルを作成
        2. データベースセッションに追加
        3. コミット（実際にデータベースに保存）
        4. 最新情報を再読み込み（自動生成されたIDやタイムスタンプを取得）
    """
    # todo.model_dump() でスキーマを辞書に変換し、owner_idを追加してTodoモデルを作成
    new_todo = models.Todo(**todo.model_dump(), owner_id=owner_id) 
    # セッションに追加（INSERT操作の準備）
    db.add(new_todo)
    # データベースにコミット（実際に保存）
    await db.commit()
    # データベースから最新情報を再読み込み（id, created_at, updated_atなどを取得）
    await db.refresh(new_todo)
    return new_todo

async def update_todo(db: AsyncSession, todo_id: int, todo: schemas.TodoUpdate, owner_id: int) -> models.Todo | None:
    """
    指定されたIDのTodoアイテムを更新する関数
    
    引数:
        db: データベースセッション（非同期）
        todo_id: 更新するTodoのID
        todo: Todo更新用のスキーマ（更新したいフィールドのみ含む）
        owner_id: Todoの所有者（ユーザー）のID（権限チェック用）
    
    戻り値:
        更新されたTodoオブジェクト、または見つからない場合は None
    
    処理の流れ:
        1. todo_id と owner_id が一致する Todo を検索
        2. 見つかった場合、スキーマから更新データを取得（未設定のフィールドは除外）
        3. 各フィールドを更新
        4. コミットして変更を保存
        5. 最新情報を再読み込み
    """
    # SELECT * FROM todos WHERE id = ? AND owner_id = ?
    # owner_id もチェックすることで、他人のTodoを更新できないようにする
    result = await db.execute(
        select(models.Todo).where(models.Todo.id == todo_id, models.Todo.owner_id == owner_id)
    )
    db_todo = result.scalar_one_or_none()
    
    if db_todo:
        # exclude_unset=True により、スキーマで明示的に設定されたフィールドのみ取得
        # これにより、部分的な更新が可能（例：completedだけ更新、titleは変更しない）
        update_data = todo.model_dump(exclude_unset=True) 
        # 各フィールドを更新
        for key, value in update_data.items():
            setattr(db_todo, key, value)
            
        # データベースにコミット（変更を保存）
        await db.commit()
        # 最新情報を再読み込み（updated_at などが更新される）
        await db.refresh(db_todo)
        
    return db_todo

async def delete_todo(db: AsyncSession, todo_id: int, owner_id: int) -> models.Todo | None:
    """
    指定されたIDのTodoアイテムを削除する関数
    
    引数:
        db: データベースセッション（非同期）
        todo_id: 削除するTodoのID
        owner_id: Todoの所有者（ユーザー）のID（権限チェック用）
    
    戻り値:
        削除されたTodoオブジェクト、または見つからない場合は None
    
    処理の流れ:
        1. todo_id と owner_id が一致する Todo を検索
        2. 見つかった場合、削除を実行
        3. コミットして変更を保存
        4. 削除されたTodoオブジェクトを返す
    """
    # SELECT * FROM todos WHERE id = ? AND owner_id = ?
    # owner_id もチェックすることで、他人のTodoを削除できないようにする
    result = await db.execute(
        select(models.Todo).where(models.Todo.id == todo_id, models.Todo.owner_id == owner_id)
    )
    db_todo = result.scalar_one_or_none()
    
    if db_todo:
        # DELETE FROM todos WHERE id = ?
        await db.delete(db_todo)
        # データベースにコミット（削除を確定）
        await db.commit()
        
    return db_todo

async def get_todo_by_id(db: AsyncSession, todo_id: int, owner_id: int) -> models.Todo | None:
    """
    指定されたIDのTodoアイテムを単体で取得する関数
    
    引数:
        db: データベースセッション（非同期）
        todo_id: 取得するTodoのID
        owner_id: Todoの所有者（ユーザー）のID（権限チェック用）
    
    戻り値:
        見つかった場合: models.Todo オブジェクト
        見つからない場合: None
    """
    # SELECT * FROM todos WHERE id = ? AND owner_id = ?
    result = await db.execute(
        select(models.Todo).where(
            models.Todo.id == todo_id,
            models.Todo.owner_id == owner_id
        )
    )
    return result.scalar_one_or_none()

async def reorder_todos(db: AsyncSession, todo_ids: list[int], owner_id: int):
    """
    Todoのリスト順序を一括更新する関数（ドラッグ&ドロップ対応）
    
    引数:
        db: データベースセッション（非同期）
        todo_ids: 新しい順序でのTodoのIDリスト（例: [3, 1, 2]）
        owner_id: Todoの所有者（ユーザー）のID（権限チェック用）
    
    処理の改善:
        1. ユーザーが所有する指定されたIDのTodoを一度に全件取得
        2. メモリ上で順序を更新し、セッションに一括登録
        3. これにより、ループ内での個別のSELECT発行を抑制し、パフォーマンスを向上
    """
    # 1. 指定されたIDのうち、ユーザーが所有しているものだけをDBから一括取得
    # SQL: SELECT * FROM todos WHERE id IN (...) AND owner_id = ?
    stmt = (
        select(models.Todo)
        .where(models.Todo.id.in_(todo_ids))
        .where(models.Todo.owner_id == owner_id)
    )
    result = await db.execute(stmt)
    todos = {t.id: t for t in result.scalars().all()}
    
    # 2. 受取ったIDリストの順序に従って order カラムを更新
    # 取得できた（＝所有権が確認できた）Todoのみ更新対象とする
    for index, t_id in enumerate(todo_ids):
        if t_id in todos:
            todo = todos[t_id]
            if todo.order != index:
                todo.order = index
                db.add(todo)
    
    # 3. 変更を一括コミット
    await db.commit()

# ==============================================================================
# プロジェクト関連の CRUD 操作
# ==============================================================================

async def get_projects(db: AsyncSession, owner_id: int) -> list[models.Project]:
    """
    特定ユーザーの全てのプロジェクトを取得する関数
    """
    result = await db.execute(
        select(models.Project).where(models.Project.owner_id == owner_id).order_by(models.Project.created_at.desc())
    )
    return result.scalars().all()

async def get_project_by_id(db: AsyncSession, project_id: int, owner_id: int) -> models.Project | None:
    """
    指定されたIDのプロジェクトを取得する関数
    """
    result = await db.execute(
        select(models.Project).where(models.Project.id == project_id, models.Project.owner_id == owner_id)
    )
    return result.scalar_one_or_none()

async def create_project(db: AsyncSession, project: schemas.ProjectCreate, owner_id: int) -> models.Project:
    """
    新しいプロジェクトを作成する関数
    """
    db_project = models.Project(**project.model_dump(), owner_id=owner_id)
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    return db_project

async def update_project(db: AsyncSession, project_id: int, project: schemas.ProjectUpdate, owner_id: int) -> models.Project | None:
    """
    プロジェクトを更新する関数
    """
    db_project = await get_project_by_id(db, project_id, owner_id)
    if not db_project:
        return None
    
    update_data = project.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_project, key, value)
    
    await db.commit()
    await db.refresh(db_project)
    return db_project

async def delete_project(db: AsyncSession, project_id: int, owner_id: int) -> models.Project | None:
    """
    プロジェクトを削除する関数
    """
    db_project = await get_project_by_id(db, project_id, owner_id)
    if db_project:
        await db.delete(db_project)
        await db.commit()
    return db_project

async def get_project_summaries(db: AsyncSession, owner_id: int):
    """
    各プロジェクトのタスク統計（総数、完了数）を含むサマリーを取得する
    """
    from sqlalchemy import func
    
    # プロジェクト一覧を取得
    stmt = select(models.Project).where(models.Project.owner_id == owner_id)
    result = await db.execute(stmt)
    projects = result.scalars().all()
    
    summaries = []
    for p in projects:
        # このプロジェクトに紐づくタスク数をカウント
        todo_stmt = select(func.count(models.Todo.id)).where(models.Todo.project_id == p.id)
        completed_stmt = select(func.count(models.Todo.id)).where(models.Todo.project_id == p.id, models.Todo.completed == True)
        
        todo_count = (await db.execute(todo_stmt)).scalar() or 0
        completed_count = (await db.execute(completed_stmt)).scalar() or 0
        
        # schemas.ProjectSummary に基づく辞書データを作成
        summary = {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
            "owner_id": p.owner_id,
            "todo_count": todo_count,
            "completed_count": completed_count
        }
        summaries.append(summary)
        
    return summaries
