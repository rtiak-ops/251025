from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
# IntegrityError をインポートに追加
from sqlalchemy.exc import IntegrityError 
from typing import Optional
from fastapi import HTTPException
from . import models, schemas
from passlib.context import CryptContext
# PostgreSQLのエラーコードを取得するためにインポート (環境に応じて変更が必要)
import asyncpg.exceptions 

# ----------------------------------------------------------------------
# パスワードハッシュ化の設定
# ----------------------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ----------------------------------------------------------------------
# ユーザー関連の CRUD
# ----------------------------------------------------------------------

async def get_user_by_email(db: AsyncSession, email: str) -> Optional[models.User]:
    """メールアドレスでユーザーを検索する関数"""
    result = await db.execute(select(models.User).where(models.User.email == email))
    return result.scalar_one_or_none()

async def create_user(db: AsyncSession, user: schemas.UserCreate) -> models.User:
    """
    新しいユーザーを作成する関数
    - 重複登録時には 409 Conflict を返すように修正済み
    """
    try:
        # 1. パスワードをbcryptでハッシュ化
        hashed_password = pwd_context.hash(user.password)
    except ValueError as e:
        # パスワードのハッシュ化エラー
        raise HTTPException(status_code=400, detail=str(e))
    
    # 2. ユーザーモデルのインスタンスを作成
    db_user = models.User(email=user.email, hashed_password=hashed_password)
    
    # 3. セッションに追加（INSERT操作）
    db.add(db_user)
    
    # 4. データベースにコミット（重複エラーをここで捕捉）
    try:
        await db.commit()
    
    except IntegrityError as e:
        # コミット失敗時はロールバック
        await db.rollback()
        
        # PostgreSQLのUniqueViolationエラーを判定
        if isinstance(e.orig, asyncpg.exceptions.UniqueViolationError) or 'duplicate key value violates unique constraint' in str(e):
             # UNIQUE制約違反の場合 (メールアドレス重複)
             # HTTP 409 Conflict を使用
             raise HTTPException(
                 status_code=409, 
                 detail="このメールアドレスは既に登録されています。"
             )
        else:
             # その他の IntegrityError
             raise HTTPException(
                 status_code=500, 
                 detail="データベース制約エラーが発生しました。"
             )
    
    # 5. データベースから最新の情報を再読み込み
    await db.refresh(db_user)
    
    return db_user

async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[models.User]:
    """ユーザーの認証を行う関数"""
    user = await get_user_by_email(db, email=email)
    if not user:
        return None
    if not pwd_context.verify(password, user.hashed_password):
        return None
    return user

# ----------------------------------------------------------------------
# To Do 関連の CRUD (変更なし)
# ----------------------------------------------------------------------

async def get_todos(db: AsyncSession, owner_id: int) -> list[models.Todo]:
    """データベースから全ての Todo アイテムを取得します。"""
    result = await db.execute(
        select(models.Todo).where(models.Todo.owner_id == owner_id).order_by(models.Todo.order)
    )
    return result.scalars().all()

async def create_todo(db: AsyncSession, todo: schemas.TodoCreate, owner_id: int) -> models.Todo:
    """新しい Todo アイテムを作成し、DB にコミットします。"""
    new_todo = models.Todo(**todo.model_dump(), owner_id=owner_id) 
    db.add(new_todo)
    await db.commit()
    await db.refresh(new_todo)
    return new_todo

async def update_todo(db: AsyncSession, todo_id: int, todo: schemas.TodoUpdate, owner_id: int) -> Optional[models.Todo]:
    """指定された ID の Todo アイテムを更新します。"""
    result = await db.execute(
        select(models.Todo).where(models.Todo.id == todo_id, models.Todo.owner_id == owner_id)
    )
    db_todo = result.scalar_one_or_none()
    
    if db_todo:
        update_data = todo.model_dump(exclude_unset=True) 
        for key, value in update_data.items():
            setattr(db_todo, key, value)
            
        await db.commit()
        await db.refresh(db_todo)
        
    return db_todo

async def delete_todo(db: AsyncSession, todo_id: int, owner_id: int) -> Optional[models.Todo]:
    """指定された ID の Todo アイテムを削除します。"""
    result = await db.execute(
        select(models.Todo).where(models.Todo.id == todo_id, models.Todo.owner_id == owner_id)
    )
    db_todo = result.scalar_one_or_none()
    
    if db_todo:
        await db.delete(db_todo)
        await db.commit()
        
    return db_todo

async def get_todo_by_id(db: AsyncSession, todo_id: int, owner_id: int) -> Optional[models.Todo]:
    """指定された ID の Todo アイテムを単体で取得します。"""
    return result.scalar_one_or_none()

async def reorder_todos(db: AsyncSession, todo_ids: list[int], owner_id: int):
    """
    Todoのリスト順序を一括更新する
    受け取ったIDリストの順番通りに order カラムを更新
    """
    # ユーザーのTodoだけ対象にするため、一度所有権を確認するのが望ましいが
    # ここでは簡易的にリスト内のIDがユーザーのものであると仮定して更新、
    # もしくは個別にUPDATEを実行する単純なループで実装
    for index, t_id in enumerate(todo_ids):
        # 効率化のためバルク更新が望ましいが、非同期ORMでの単純な実装としてループ処理
        stmt = (
            select(models.Todo)
            .where(models.Todo.id == t_id)
            .where(models.Todo.owner_id == owner_id)
        )
        result = await db.execute(stmt)
        todo = result.scalar_one_or_none()
        if todo:
            todo.order = index
            db.add(todo)
    
    await db.commit()