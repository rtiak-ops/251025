from __future__ import annotations
import os
import time
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db, engine
from .. import models, schemas, dependencies

router = APIRouter(prefix="/monitor", tags=["Monitoring"])

@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    システムの健康状態を確認し、DB接続とパフォーマンス指標を返します。
    """
    start_time = time.time()
    try:
        # DB接続テスト
        await db.execute(text("SELECT 1"))
        db_status = "operational"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    db_latency = time.time() - start_time

    return {
        "status": "healthy",
        "timestamp": time.time(),
        "database": {
            "status": db_status,
            "latency_sec": round(db_latency, 4)
        },
        "environment": dependencies.config.ENV,
        "version": "1.1.0"
    }

@router.get("/stats")
async def get_system_stats(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(dependencies.admin_required)
):
    """
    管理者向けのシステム統計情報を取得します。
    所属組織のデータのみを取得します。
    """
    from ..models import User, Project, Todo, AuditLog
    from sqlalchemy import func, select

    user_stmt = select(func.count(User.id))
    project_stmt = select(func.count(Project.id))
    todo_stmt = select(func.count(Todo.id))
    audit_stmt = select(func.count(AuditLog.id))

    if current_user.organization_id:
        user_stmt = user_stmt.where(User.organization_id == current_user.organization_id)
        project_stmt = project_stmt.where(Project.organization_id == current_user.organization_id)
        # Todo is linked via Project or Owner. 
        todo_stmt = todo_stmt.join(User, Todo.owner_id == User.id).where(User.organization_id == current_user.organization_id)
        audit_stmt = audit_stmt.where(AuditLog.organization_id == current_user.organization_id)

    user_count = (await db.execute(user_stmt)).scalar()
    project_count = (await db.execute(project_stmt)).scalar()
    todo_count = (await db.execute(todo_stmt)).scalar()
    audit_count = (await db.execute(audit_stmt)).scalar()

    return {
        "counts": {
            "users": user_count,
            "projects": project_count,
            "tasks": todo_count,
            "audit_logs": audit_count
        }
    }
