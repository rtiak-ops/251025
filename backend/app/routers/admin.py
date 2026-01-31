from datetime import datetime

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, dependencies, models, schemas
from ..database import get_db
from ..limiter import limiter

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/audit-logs", response_model=list[schemas.AuditLogOut])
async def read_audit_logs(
    skip: int = 0,
    limit: int = 100,
    user_email: str | None = None,
    action: str | None = None,
    resource_type: str | None = None,
    query: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(dependencies.admin_required),
):
    """
    所属組織の監査ログ（操作履歴）を取得します。管理者権限が必要です。

    Args:
        skip (int): 取得開始位置（オフセット）
        limit (int): 取得する最大件数
        user_email (str | None): 実行ユーザーのメールアドレスによる絞り込み
        action (str | None): 操作の種類（CREATE, UPDATE等）による絞り込み
        resource_type (str | None): 操作対象（TODO, PROJECT等）による絞り込み
        query (str | None): 全体検索キーワード
        start_date (datetime | None): 検索開始日時
        end_date (datetime | None): 検索終了日時
    """
    return await crud.get_audit_logs(
        db, 
        organization_id=current_user.organization_id, 
        skip=skip, 
        limit=limit,
        user_email=user_email,
        action=action,
        resource_type=resource_type,
        query=query,
        start_date=start_date,
        end_date=end_date
    )

@router.get("/users", response_model=list[schemas.UserOut])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(dependencies.admin_required),
):
    """
    所属組織に属しているユーザーのリストを取得します。管理者権限が必要です。
    組織に所属していない管理者は、この機能を使用できません。
    """
    from fastapi import HTTPException
    from sqlalchemy import select

    from ..models import User
    
    # 組織に所属していない場合はエラー
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="組織に所属していないため、ユーザー管理機能を使用できません。先に組織を作成してください。"
        )
    
    # 同じ組織のユーザーのみを取得
    stmt = select(User).where(
        User.organization_id == current_user.organization_id
    ).offset(skip).limit(limit).order_by(User.id)
    
    result = await db.execute(stmt)
    return result.scalars().all()

@router.patch("/users/{user_id}/role", response_model=schemas.UserOut)
async def update_user_role(
    user_id: int,
    role_data: schemas.UserRoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(dependencies.admin_required),
):
    """
    指定したユーザーの権限（ロール）を変更します。
    変更内容は監査ログに記録されます。

    注意: システム全体の管理者が0人になるような変更（自分一人の場合等）は拒否されます。
    同じ組織に所属するユーザーのみ変更可能です。
    """
    from sqlalchemy import select

    from ..models import User
    
    # 組織に所属していない場合はエラー
    if not current_user.organization_id:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="組織に所属していないため、ユーザー管理機能を使用できません。"
        )
    
    # 対象ユーザーを取得
    result = await db.execute(select(User).where(User.id == user_id))
    db_user = result.scalar_one_or_none()
    
    if not db_user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    # 同じ組織のユーザーかチェック
    if db_user.organization_id != current_user.organization_id:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="他の組織のユーザーを変更することはできません。"
        )
    
    old_role = db_user.role
    new_role = role_data.role

    # 【管理者一人制限のバリデーション】
    # 管理者が一人しかいない状態で、その管理者を一般ユーザーに変更しようとするのを防ぎます。
    if old_role == "admin" and new_role != "admin":
        from sqlalchemy import func
        admin_count = (await db.execute(
            select(func.count(User.id)).where(User.role == "admin")
        )).scalar()
        if admin_count <= 1:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="システムに最低一人の管理者が存在する必要があります。自分以外の管理者を先に作成してください。"
            )

    # ロールを更新してデータベースに保存
    db_user.role = new_role
    await db.commit()
    await db.refresh(db_user)
    
    # 更新アクションを監査ログに記録
    await crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="UPDATE_ROLE",
        resource_type="USER",
        resource_id=user_id,
        details=f"Role changed from {old_role} to {new_role}",
        organization_id=current_user.organization_id
    )
    
    return db_user

@router.post("/users/assign", response_model=schemas.UserOut)
@limiter.limit("5/minute")
async def add_user_to_organization(
    request: Request,
    data: schemas.UserOrganizationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(dependencies.admin_required),
):
    """
    既存のユーザーをメールアドレスで検索し、自分が管理する組織のメンバーとして追加します。
    
    制限: 
    - 管理者自身が組織に所属している必要があります。
    - 既に対象ユーザーが何らかの組織に所属している場合は追加できません。
    """
    from fastapi import HTTPException
    from sqlalchemy import select

    from ..models import User

    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="あなたは組織に所属していないため、メンバーを追加できません。先に組織を作成してください。")

    # 指定されたメールアドレスでユーザーを検索
    result = await db.execute(select(User).where(User.email == data.email))
    db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(status_code=404, detail="指定されたメールアドレスのユーザーが見つかりません。")

    # ユーザーが既に組織に入っているかチェック
    if db_user.organization_id:
        if db_user.organization_id == current_user.organization_id:
            raise HTTPException(status_code=400, detail="このユーザーは既にあなたの組織に所属しています。")
        else:
            raise HTTPException(status_code=400, detail="このユーザーは既に別の組織に所属しています。")

    # 組織IDを紐付けて保存
    db_user.organization_id = current_user.organization_id
    await db.commit()
    await db.refresh(db_user)

    # 追加アクションを監査ログに記録
    await crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="ADD_TO_ORG",
        resource_type="USER",
        resource_id=db_user.id,
        details=f"User {db_user.email} added to organization {current_user.organization_id}",
        organization_id=current_user.organization_id
    )

    return db_user

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(dependencies.admin_required),
):
    """
    指定したユーザーを削除します。管理者権限が必要です。
    
    制限:
    - 自分自身を削除することはできません
    - 最後の管理者を削除することはできません
    - 同じ組織に所属するユーザーのみ削除可能です
    """
    from fastapi import HTTPException
    from sqlalchemy import func, select

    from ..models import User
    
    # 組織に所属していない場合はエラー
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="組織に所属していないため、ユーザー管理機能を使用できません。"
        )
    
    # 自分自身の削除を防止
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="自分自身を削除することはできません。"
        )
    
    # 対象ユーザーを取得
    result = await db.execute(select(User).where(User.id == user_id))
    db_user = result.scalar_one_or_none()
    
    if not db_user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    # 同じ組織のユーザーかチェック
    if db_user.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="他の組織のユーザーを削除することはできません。"
        )
    
    # 最後の管理者の削除を防止
    if db_user.role == "admin":
        admin_count = (await db.execute(
            select(func.count(User.id)).where(User.role == "admin")
        )).scalar()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="システムに最低一人の管理者が存在する必要があります。"
            )
    
    # 監査ログに記録
    await crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="DELETE_USER",
        resource_type="USER",
        resource_id=user_id,
        details=f"User {db_user.email} deleted by {current_user.email}",
        organization_id=current_user.organization_id
    )
    
    # ユーザーを削除
    await db.delete(db_user)
    await db.commit()

