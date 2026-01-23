from __future__ import annotations
import logging
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pythonjsonlogger import json
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from slowapi.middleware import SlowAPIMiddleware

from .database import Base, engine
from . import models
from .routers import ai, auth, todos, projects, admin, monitor, organizations
from .limiter import limiter
from .middleware import RequestLoggingMiddleware, SecurityHeadersMiddleware
from .core.config import CORS_ORIGINS, PROJECT_NAME

# --- ロギング設定 ---
logger = logging.getLogger(__name__)
logHandler = logging.StreamHandler(sys.stdout)
formatter = json.JsonFormatter(
    '%(timestamp)s %(level)s %(name)s %(message)s',
    json_ensure_ascii=False
)
logHandler.setFormatter(formatter)
root_logger = logging.getLogger()
root_logger.addHandler(logHandler)
root_logger.setLevel(logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 起動時: DB初期化
    logger.info("アプリケーション起動: データベース初期化を実行します。")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("データベースの初期化が完了しました。")
    except Exception as e:
        logger.error(f"初期化中にエラーが発生しました: {e}")

    yield

    # 終了時: 接続プールを閉じる
    logger.info("アプリケーション終了処理を開始します。")
    await engine.dispose()
    logger.info("アプリケーション終了処理が完了しました。")

# アプリケーション初期化
app = FastAPI(title=PROJECT_NAME, lifespan=lifespan)

# レート制限
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# カスタムミドルウェア
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ヘルスチェック
@app.get("/health", tags=["Health"])
async def health_check():
    from sqlalchemy import text
    from .database import get_db
    try:
        async for db in get_db():
            await db.execute(text("SELECT 1"))
            break
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"ヘルスチェック失敗: {e}")
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

# ルーティング
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(todos.router)
app.include_router(ai.router)
app.include_router(admin.router)
app.include_router(monitor.router)
app.include_router(organizations.router)
