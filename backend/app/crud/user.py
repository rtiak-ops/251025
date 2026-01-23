from __future__ import annotations
import asyncpg.exceptions
from fastapi import HTTPException
from passlib.context import CryptContext
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from .. import models, schemas
from ..core.security import get_password_hash, verify_password

async def get_user_by_email(db: AsyncSession, email: str) -> models.User | None:
    """
    メールアドレスでユーザーを検索する関数
    """
    result = await db.execute(select(models.User).where(models.User.email == email))
    return result.scalar_one_or_none()

async def create_user(db: AsyncSession, user: schemas.UserCreate) -> models.User:
    """
    新しいユーザーを作成する関数（登録処理）
    """
    try:
        hashed_password = get_password_hash(user.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    db_user = models.User(email=user.email, hashed_password=hashed_password)
    
    # 最初のユーザーを管理者に設定
    user_count = (await db.execute(select(func.count(models.User.id)))).scalar()
    if user_count == 0:
        db_user.role = "admin"
    
    db.add(db_user)
    
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        if isinstance(e.orig, asyncpg.exceptions.UniqueViolationError) or 'duplicate key value violates unique constraint' in str(e):
             raise HTTPException(
                 status_code=409, 
                 detail="このメールアドレスは既に登録されています。"
             )
        else:
             raise HTTPException(
                 status_code=500, 
                 detail="データベース制約エラーが発生しました。"
             )
    
    await db.refresh(db_user)
    return db_user

async def authenticate_user(db: AsyncSession, email: str, password: str) -> models.User | None:
    """
    ユーザーの認証を行う関数（ログイン処理）
    """
    user = await get_user_by_email(db, email=email)
    if not user:
        return None
    
    if not verify_password(password, user.hashed_password):
        return None
    
    return user
