from __future__ import annotations

import asyncpg.exceptions
from fastapi import HTTPException
from sqlalchemy import func, select
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
        raise HTTPException(status_code=400, detail=str(e)) from e
    
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
             ) from e
        else:
             raise HTTPException(
                 status_code=500, 
                 detail="データベース制約エラーが発生しました。"
             ) from e
    
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

async def get_organization_users(db: AsyncSession, organization_id: int, skip: int = 0, limit: int = 100) -> list[models.User]:
    """
    組織に所属するユーザーのリストを取得します。
    """
    stmt = select(models.User).where(
        models.User.organization_id == organization_id
    ).offset(skip).limit(limit).order_by(models.User.id)
    
    result = await db.execute(stmt)
    return result.scalars().all()

async def update_user_role(db: AsyncSession, user_id: int, organization_id: int, new_role: str) -> models.User:
    """
    ユーザーの権限（ロール）を更新します。バリデーションも含みます。
    """
    # 対象ユーザーを取得
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    db_user = result.scalar_one_or_none()
    
    if not db_user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    # 同じ組織のユーザーかチェック
    if db_user.organization_id != organization_id:
        raise HTTPException(
            status_code=403,
            detail="他の組織のユーザーを変更することはできません。"
        )
    
    old_role = db_user.role

    # 【管理者一人制限のバリデーション】
    if old_role == "admin" and new_role != "admin":
        admin_count = (await db.execute(
            select(func.count(models.User.id)).where(models.User.role == "admin")
        )).scalar()
        if admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="システムに最低一人の管理者が存在する必要があります。自分以外の管理者を先に作成してください。"
            )

    # ロールを更新
    db_user.role = new_role
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def assign_user_to_organization(db: AsyncSession, email: str, organization_id: int) -> models.User:
    """
    ユーザーをメールアドレスで検索し、組織に割り当てます。
    """
    result = await db.execute(select(models.User).where(models.User.email == email))
    db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(status_code=404, detail="指定されたメールアドレスのユーザーが見つかりません。")

    # ユーザーが既に組織に入っているかチェック
    if db_user.organization_id:
        if db_user.organization_id == organization_id:
            raise HTTPException(status_code=400, detail="このユーザーは既にあなたの組織に所属しています。")
        else:
            raise HTTPException(status_code=400, detail="このユーザーは既に別の組織に所属しています。")

    # 組織IDを紐付け
    db_user.organization_id = organization_id
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def delete_user(db: AsyncSession, user_id: int, current_user_id: int, organization_id: int) -> bool:
    """
    ユーザーを削除します。バリデーションも含みます。
    """
    # 自分自身の削除を防止
    if user_id == current_user_id:
        raise HTTPException(status_code=400, detail="自分自身を削除することはできません。")
    
    # 対象ユーザーを取得
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    db_user = result.scalar_one_or_none()
    
    if not db_user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    # 同じ組織のユーザーかチェック
    if db_user.organization_id != organization_id:
        raise HTTPException(status_code=403, detail="他の組織のユーザーを削除することはできません。")
    
    # 最後の管理者の削除を防止
    if db_user.role == "admin":
        admin_count = (await db.execute(
            select(func.count(models.User.id)).where(models.User.role == "admin")
        )).scalar()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="システムに最低一人の管理者が存在する必要があります。")
    
    # ユーザーを削除
    await db.delete(db_user)
    await db.commit()
    return True
