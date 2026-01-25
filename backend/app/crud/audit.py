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
    システムの操作履歴（監査ログ）を記録します。

    Args:
        db (AsyncSession): データベースセッション
        user_id (int | None): 操作を行ったユーザーのID
        action (str): アクションの種類（例: "create", "update", "delete", "login"）
        resource_type (str): 対象リソースの種類（例: "project", "todo", "user"）
        resource_id (int | None): 対象リソースのID
        details (dict | None): 追加の詳細情報。datetime型が含まれる場合はISOフォーマットに変換されます。
        organization_id (int | None): 所属組織のID（組織単位でのログ分離用）
    """
    # 詳細情報（dict）をJSON文字列に変換。datetime型などはシリアライズ可能な形式に処理。
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

    # ログエントリーの作成と保存
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
    条件を指定して監査ログの一覧を取得します。ユーザーのメールアドレスもJOINして取得します。

    Args:
        db (AsyncSession): データベースセッション
        organization_id (int | None): フィルタリングする組織ID
        skip (int): 読み飛ばす件数（オフセット）
        limit (int): 取得する最大件数
        user_email (str | None): ユーザーのメールアドレスによる絞り込み
        action (str | None): アクションの種類による絞り込み
        resource_type (str | None): リソース種類による絞り込み
        query (str | None): 全体検索（詳細情報、アクション、種別、作成日時を対象）
        start_date (datetime | None): 期間指定（開始）
        end_date (datetime | None): 期間指定（終了）

    Returns:
        list[AuditLogOut]: 取得されたログのリスト（メールアドレス情報込み）
    """
    # AuditLogとUserを外部結合して検索
    stmt = select(AuditLog, User.email).outerjoin(User, AuditLog.user_id == User.id)
    
    # 各種フィルタリング条件の適用
    if organization_id:
        stmt = stmt.where(AuditLog.organization_id == organization_id)
    
    if user_email:
        stmt = stmt.where(User.email.ilike(f"%{user_email}%"))
    
    if action:
        stmt = stmt.where(AuditLog.action == action)
        
    if resource_type:
        stmt = stmt.where(AuditLog.resource_type == resource_type)
        
    # キーワードによるあいまい検索
    if query:
        stmt = stmt.where(or_(
            AuditLog.details.ilike(f"%{query}%"),
            AuditLog.resource_type.ilike(f"%{query}%"),
            AuditLog.action.ilike(f"%{query}%"),
            cast(AuditLog.created_at, String).ilike(f"%{query}%")
        ))
    
    # 期間指定
    if start_date:
        stmt = stmt.where(AuditLog.created_at >= start_date)
    
    if end_date:
        stmt = stmt.where(AuditLog.created_at <= end_date)
        
    # 新しいものから順に取得
    result = await db.execute(
        stmt.order_by(AuditLog.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    
    # 結果の整形
    logs = []
    for row in result:
        log, email = row
        log_out = AuditLogOut.model_validate(log)
        log_out.user_email = email
        logs.append(log_out)
        
    return logs
