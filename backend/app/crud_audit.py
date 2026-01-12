from sqlalchemy.ext.asyncio import AsyncSession
from .models import AuditLog
from .schemas import AuditLogOut
from datetime import datetime, timezone
import json

async def create_audit_log(
    db: AsyncSession,
    user_id: int | None,
    action: str,
    resource_type: str,
    resource_id: int | None = None,
    details: dict | None = None
):
    """
    監査ログを記録します。
    """
    db_log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=json.dumps(details, ensure_ascii=False) if details else None
    )
    db.add(db_log)
    await db.commit()
    await db.refresh(db_log)
    return db_log

async def get_audit_logs(db: AsyncSession, skip: int = 0, limit: int = 100):
    """
    監査ログを取得します。
    """
    from sqlalchemy import select
    from .models import User
    
    # ユーザー情報も一緒に取得（email表示用）
    result = await db.execute(
        select(AuditLog, User.email)
        .outerjoin(User, AuditLog.user_id == User.id)
        .order_by(AuditLog.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    
    logs = []
    for row in result:
        log, email = row
        log_out = AuditLogOut.model_validate(log)
        log_out.user_email = email
        logs.append(log_out)
        
    return logs
