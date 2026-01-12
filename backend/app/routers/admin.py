from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from .. import schemas, crud_audit, auth
from ..auth import admin_required
from ..database import get_db

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/audit-logs", response_model=list[schemas.AuditLogOut])
async def read_audit_logs(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: schemas.UserOut = Depends(admin_required),
):
    """
    全ユーザーの監査ログを取得します。
    実運用では管理者権限チェックが必要ですが、ポートフォリオ公開用に全認証ユーザーに開放しています。
    """
    return await crud_audit.get_audit_logs(db, skip=skip, limit=limit)

@router.get("/users", response_model=list[schemas.UserOut])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: schemas.UserOut = Depends(admin_required),
):
    """
    全ユーザーのリストを取得します。
    """
    from ..models import User
    from sqlalchemy import select
    result = await db.execute(select(User).offset(skip).limit(limit).order_by(User.id))
    return result.scalars().all()

@router.patch("/users/{user_id}/role", response_model=schemas.UserOut)
async def update_user_role(
    user_id: int,
    role_data: schemas.UserRoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: schemas.UserOut = Depends(admin_required),
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
    await crud_audit.create_audit_log(
        db,
        user_id=current_user.id,
        action="UPDATE_ROLE",
        resource_type="USER",
        resource_id=user_id,
        details=f"Role changed from {old_role} to {new_role}"
    )
    
    return db_user
