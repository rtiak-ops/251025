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
