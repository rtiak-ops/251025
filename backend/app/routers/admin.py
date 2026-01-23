from datetime import datetime
from fastapi import APIRouter, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from .. import schemas, models, crud, dependencies
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
    所属組織の監査ログを取得します。
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
    所属組織のユーザーリストを取得します。
    """
    from ..models import User
    from sqlalchemy import select
    stmt = select(User).offset(skip).limit(limit).order_by(User.id)
    if current_user.organization_id:
        stmt = stmt.where(User.organization_id == current_user.organization_id)
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
    ユーザーの権限を変更し、その操作を監査ログに記録します。
    """
    from ..models import User
    from sqlalchemy import select
    
    # 対象ユーザーを取得
    result = await db.execute(select(User).where(User.id == user_id))
    db_user = result.scalar_one_or_none()
    
    if not db_user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
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

    db_user.role = new_role
    await db.commit()
    await db.refresh(db_user)
    
    # 監査ログに記録
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
    既存のユーザーをメールアドレスで検索し、自分の組織に追加します。
    """
    from ..models import User
    from sqlalchemy import select
    from fastapi import HTTPException

    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="あなたは組織に所属していないため、メンバーを追加できません。先に組織を作成してください。")

    # 対象ユーザーを取得
    result = await db.execute(select(User).where(User.email == data.email))
    db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(status_code=404, detail="指定されたメールアドレスのユーザーが見つかりません。")

    if db_user.organization_id:
        if db_user.organization_id == current_user.organization_id:
            raise HTTPException(status_code=400, detail="このユーザーは既にあなたの組織に所属しています。")
        else:
            raise HTTPException(status_code=400, detail="このユーザーは既に別の組織に所属しています。")

    # 組織を紐付け
    db_user.organization_id = current_user.organization_id
    await db.commit()
    await db.refresh(db_user)

    # 監査ログに記録
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
