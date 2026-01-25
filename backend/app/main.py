from __future__ import annotations
import logging
import sys
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pythonjsonlogger import json
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from slowapi.middleware import SlowAPIMiddleware

from .database import Base, engine, AsyncSessionLocal
from . import models
from .routers import ai, auth, todos, projects, admin, monitor, organizations
from .limiter import limiter
from .middleware import RequestLoggingMiddleware, SecurityHeadersMiddleware
from .core.config import CORS_ORIGINS, PROJECT_NAME, DEBUG, ENV

# --- ロギング設定（JSON形式で標準出力に出力） ---
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
    """
    アプリケーションの起動時と終了時に実行されるライフサイクル関数
    """
    # 起動時: データベースのテーブル作成・初期化を実行
    logger.info("アプリケーション起動: データベース初期化を開始します。")
    try:
        # DB接続に時間がかかりすぎて504になるのを防ぐため、5秒でタイムアウトさせる
        async with engine.begin() as conn:
            await asyncio.wait_for(
                conn.run_sync(Base.metadata.create_all), 
                timeout=10.0
            )
        logger.info("データベースの初期化が完了しました。")
    except asyncio.TimeoutError:
        logger.error("データベース接続がタイムアウトしました。DATABASE_URLまたはネットワーク設定を確認してください。")
    except Exception as e:
        logger.error(f"初期化中にエラーが発生しました: {str(e)}", exc_info=True)

    yield # ここでアプリケーションがリクエストの待機を開始

    # 終了時: データベースの接続プールを安全に閉じる
    logger.info("アプリケーション終了処理を開始します。")
    await engine.dispose()
    logger.info("アプリケーション終了処理が完了しました。")

# FastAPIのアプリケーションインスタンスを作成
# DEBUG=True の場合、エラー時にブラウザへ詳細なトレースバックを表示します
app = FastAPI(title=PROJECT_NAME, lifespan=lifespan, debug=DEBUG)

# --- ミドルウェア・例外ハンドラーの設定 ---

# レート制限（スロットリング）の設定
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# カスタムミドルウェアの追加
app.add_middleware(RequestLoggingMiddleware)      # リクエストログの記録
app.add_middleware(SecurityHeadersMiddleware)     # セキュリティヘッダーの付与

# CORS（Cross-Origin Resource Sharing）の設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,                      # 許可するオリジン（フロントエンドのURL等）
    allow_credentials=True,                          # クッキーや認証情報の含めを許可
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"], # 許可するHTTPメソッド
    allow_headers=["*"],                             # すべてのヘッダーを許可
)

# ヘルスチェック用エンドポイント（インフラ監視用）
@app.get("/health", tags=["Health"])
async def health_check():
    """
    システムの健康状態を確認し、DB接続状況を含めてレスポンスを返します。
    """
    from sqlalchemy import text
    from .database import get_db
    try:
        # DB接続が可能かシンプルなクエリでテスト
        # ここでハングして504になるのを防ぐため、3秒でタイムアウトさせる
        async with AsyncSessionLocal() as db:
            await asyncio.wait_for(db.execute(text("SELECT 1")), timeout=3.0)
            
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except (asyncio.TimeoutError, Exception) as e:
        logger.error(f"ヘルスチェック失敗: {str(e)}")
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "error": "Database connection timed out or failed. Check DATABASE_URL.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

# --- 各ルーター（機能単位のエンドポイント）の登録 ---
app.include_router(auth.router)           # 認証（登録、ログイン）
app.include_router(projects.router)       # プロジェクト管理
app.include_router(todos.router)          # タスク管理
app.include_router(ai.router)             # AI連携（タスク分解等）
app.include_router(admin.router)          # 管理者機能（監査ログ、ユーザー管理）
app.include_router(monitor.router)        # 監視、統計
app.include_router(organizations.router)  # 組織管理
