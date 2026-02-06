from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, dependencies, models, schemas
from ..database import get_db

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
