from __future__ import annotations
import asyncpg.exceptions
from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from .. import models, schemas
from ..core.security import get_password_hash, verify_password

async def get_user_by_email(db: AsyncSession, email: str) -> models.User | None:
    """
    指定されたメールアドレスを持つユーザーを検索します。

    Args:
        db (AsyncSession): データベースセッション
        email (str): 検索するメールアドレス

    Returns:
        models.User | None: 見つかったユーザーモデル、存在しない場合は None
    """
    # メールアドレスでフィルタリングして検索
    result = await db.execute(select(models.User).where(models.User.email == email))
    return result.scalar_one_or_none()

async def create_user(db: AsyncSession, user: schemas.UserCreate) -> models.User:
    """
    新しいユーザーをデータベースに登録します。
    パスワードのハッシュ化、最初のユーザーの管理者昇格、一意制約エラーのハンドリングを行います。

    Args:
        db (AsyncSession): データベースセッション
        user (schemas.UserCreate): 登録するユーザーの情報

    Returns:
        models.User: 作成されたユーザーモデル

    Raises:
        HTTPException: メールアドレスの重複やパスワードバリデーションエラー時
    """
    try:
        # 安全のためにパスワードをハッシュ化して保存
        hashed_password = get_password_hash(user.password)
    except ValueError as e:
        # パスワード強度チェックなどでエラーが出た場合
        raise HTTPException(status_code=400, detail=str(e))
    
    # ユーザーインスタンスの作成
    db_user = models.User(email=user.email, hashed_password=hashed_password)
    
    # システム全体で管理者が一人もいない場合、登録ユーザーを自動的に管理者（admin）に設定
    admin_count = (await db.execute(
        select(func.count(models.User.id)).where(models.User.role == "admin")
    )).scalar()
    if admin_count == 0:
        db_user.role = "admin"
    
    db.add(db_user)
    
    try:
        # データベースにコミット
        await db.commit()
    except IntegrityError as e:
        # メールアドレスの重複など、データベースの一意制約に違反した場合の処理
        await db.rollback()
        # asyncpg の具体的なエラーまたはエラーメッセージの内容を確認
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
    
    # 保存後の最新情報を取得（ID等）
    await db.refresh(db_user)
    return db_user

async def authenticate_user(db: AsyncSession, email: str, password: str) -> models.User | None:
    """
    ユーザーの認証（ログイン）を行います。

    Args:
        db (AsyncSession): データベースセッション
        email (str): ログインメールアドレス
        password (str): 入力されたパスワード

    Returns:
        models.User | None: 認証成功時はユーザーモデル、失敗時は None
    """
    # ユーザーをメールアドレスで検索
    user = await get_user_by_email(db, email=email)
    if not user:
        return None
    
    # ハッシュ化されたパスワードと入力されたパスワードが一致するか検証
    if not verify_password(password, user.hashed_password):
        return None
    
    return user
