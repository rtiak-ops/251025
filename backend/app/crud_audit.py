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
    details: dict | None = None,
    organization_id: int | None = None
):
    """
    監査ログを記録します。
    """
    # detailsにdatetimeが含まれる場合、json.dumpsでエラーになるため文字列に変換
    if isinstance(details, dict):
        processed_details = {}
        for k, v in details.items():
            if isinstance(v, datetime):
                processed_details[k] = v.isoformat()
            else:
                processed_details[k] = v
        details_str = json.dumps(processed_details, ensure_ascii=False)
    elif details is not None:
        # すでに文字列（またはその他の型）の場合はそのまま文字列化を試みる
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
    監査ログを取得します。組織IDが指定された場合はその組織のログのみ取得します。
    フィルター条件が指定された場合は、それらで絞り込みを行います。
    """
    from sqlalchemy import select, or_
    from .models import User
    
    # ユーザー情報も一緒に取得（email表示用）
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
        from sqlalchemy import cast, String
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
