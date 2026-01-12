from __future__ import annotations
import os
import time
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db, engine
from ..auth import admin_required

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
        "environment": os.getenv("ENV", "development"),
        "version": "1.1.0"
    }

@router.get("/stats")
async def get_system_stats(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(admin_required)
):
    """
    管理者向けのシステム統計情報を取得します。
    """
    from ..models import User, Project, Todo, AuditLog
    from sqlalchemy import func, select

    user_count = (await db.execute(select(func.count(User.id)))).scalar()
    project_count = (await db.execute(select(func.count(Project.id)))).scalar()
    todo_count = (await db.execute(select(func.count(Todo.id)))).scalar()
    audit_count = (await db.execute(select(func.count(AuditLog.id)))).scalar()

    return {
        "counts": {
            "users": user_count,
            "projects": project_count,
            "tasks": todo_count,
            "audit_logs": audit_count
        }
    }
