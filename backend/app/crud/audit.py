from datetime import datetime
import json
from sqlalchemy import select, or_, cast, String
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import AuditLog, User
from ..schemas import AuditLogOut

async def create_audit_log(
    db: AsyncSession,
    user_id: int | None,
    action: str,
    resource_type: str,
    resource_id: int | None = None,
    details: dict | None = None,
    organization_id: int | None = None
):
    """
    監査ログを記録します。
    """
    if isinstance(details, dict):
        processed_details = {}
        for k, v in details.items():
            if isinstance(v, datetime):
                processed_details[k] = v.isoformat()
            else:
                processed_details[k] = v
        details_str = json.dumps(processed_details, ensure_ascii=False)
    elif details is not None:
        details_str = str(details)
    else:
        details_str = None

    db_log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details_str,
        organization_id=organization_id
    )
    db.add(db_log)
    await db.commit()
    await db.refresh(db_log)
    return db_log

async def get_audit_logs(
    db: AsyncSession, 
    organization_id: int | None = None, 
    skip: int = 0, 
    limit: int = 100,
    user_email: str | None = None,
    action: str | None = None,
    resource_type: str | None = None,
    query: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None
):
    """
    監査ログを取得します。
    """
    stmt = select(AuditLog, User.email).outerjoin(User, AuditLog.user_id == User.id)
    
    if organization_id:
        stmt = stmt.where(AuditLog.organization_id == organization_id)
    
    if user_email:
        stmt = stmt.where(User.email.ilike(f"%{user_email}%"))
    
    if action:
        stmt = stmt.where(AuditLog.action == action)
        
    if resource_type:
        stmt = stmt.where(AuditLog.resource_type == resource_type)
        
    if query:
        stmt = stmt.where(or_(
            AuditLog.details.ilike(f"%{query}%"),
            AuditLog.resource_type.ilike(f"%{query}%"),
            AuditLog.action.ilike(f"%{query}%"),
            cast(AuditLog.created_at, String).ilike(f"%{query}%")
        ))
    
    if start_date:
        stmt = stmt.where(AuditLog.created_at >= start_date)
    
    if end_date:
        stmt = stmt.where(AuditLog.created_at <= end_date)
        
    result = await db.execute(
        stmt.order_by(AuditLog.created_at.desc())
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
