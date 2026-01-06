# 必要なライブラリとモジュールのインポート
from __future__ import annotations  # Python 3.10+: 型ヒントの前方参照を簡潔に

import logging
import sys
import os
from contextlib import asynccontextmanager  # ライフサイクル管理のための Context Manager をインポート
from datetime import datetime, timezone  # ヘルスチェック用のタイムスタンプ生成
from dotenv import load_dotenv

# .env ファイルがあれば読み込む（ローカル開発用）
load_dotenv()

from fastapi import FastAPI  # FastAPI のメインクラスをインポート
from fastapi.middleware.cors import CORSMiddleware  # CORSミドルウェアをインポート
from pythonjsonlogger import json  # JSONロガー
from slowapi import Limiter, _rate_limit_exceeded_handler  # Rate Limiting
from slowapi.errors import RateLimitExceeded  # Rate Limiting
from slowapi.middleware import SlowAPIMiddleware  # Rate Limiting
from slowapi.util import get_remote_address  # Rate Limiting

# アプリケーション固有のモジュールをインポート
from .database import Base, engine  # データベース接続エンジンと、モデルのベースクラスをインポート
from .routers import ai, auth, todos  # ToDo関連のエンドポイント（ルーター）をインポート

# ----------------------------------------------------------------------
# 0. ロギングとセキュリティ設定
# ----------------------------------------------------------------------

# 【構造化ログ（JSON Logging）の設定】
# ログをテキストではなくJSON形式で出力するための設定です。
# 
# [以前の形式]: "2024-12-13 10:00:00 INFO アプリ起動"
# [今回の形式]: {"asctime": "2024-12-13...", "levelname": "INFO", "message": "アプリ起動"}
#
# メリット:
#  - DatadogやAWS CloudWatchなどのログ監視ツールで、自動的に解析（パース）可能になります
#  - 例えば「レベルがERRORのログだけ抽出したい」などが簡単になります
#  - 「運用時の可観測性（Observability）」を高めるための重要な設定です
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

# 【Rate Limiter（レート制限）のインポート】
# 悪意あるユーザーやスクリプトによる「短時間の大量アクセス」を防ぐ仕組みです。
# DoS攻撃（サービス停止攻撃）や、パスワード総当たり攻撃（ブルートフォース）への対策として必須です。
# 具体的な制限ルール（例: 1分に5回まで）は、各エンドポイント（routers/auth.pyなど）で指定します。
from .limiter import limiter # Rate Limiter Instance

# ----------------------------------------------------------------------
# 1. アプリケーションのライフサイクル管理 (起動/終了時の処理)
# ----------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ------------------------------------
    # アプリケーション起動時の処理 (startup)
    # ------------------------------------
    logger.info("アプリケーション起動: データベース初期化（create_all）を実行します。")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("データベースの初期化が完了しました。")
    except Exception as e:
        logger.error(f"初期化中にエラーが発生しました: {e}")

    yield

    # ------------------------------------
    # アプリケーション終了時の処理 (shutdown)
    # ------------------------------------
    logger.info("アプリケーション終了処理を開始します。")
    try:
        # データベース接続プールを適切に閉じる
        await engine.dispose()
        logger.info("データベース接続プールを正常にクローズしました。")
    except Exception as e:
        logger.error(f"シャットダウン処理中にエラーが発生しました: {e}", exc_info=True)
    logger.info("アプリケーション終了処理が完了しました。")

# ----------------------------------------------------------------------
# 2. FastAPI アプリケーションインスタンスの作成
# ----------------------------------------------------------------------

# lifespan 引数に定義した Context Manager を渡し、起動/終了処理を組み込む
app = FastAPI(title="Async FastAPI ToDo App", lifespan=lifespan)

# Rate Limiterの状態をアプリに紐付け
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ----------------------------------------------------------------------
# ヘルスチェックエンドポイント
# ----------------------------------------------------------------------

@app.get("/health", tags=["Health"])
async def health_check():
    """
    ヘルスチェックエンドポイント
    
    Dockerコンテナやロードバランサーがアプリケーションの稼働状態を確認するために使用します。
    データベース接続の確認も行い、システム全体の健全性を報告します。
    """
    from sqlalchemy import text
    from .database import get_db
    
    try:
        # データベース接続の確認
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
        from fastapi import status as http_status
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

# ----------------------------------------------------------------------
# 3. Middleware: Security Headers & CORS
# ----------------------------------------------------------------------
# ミドルウェアは、リクエストが本来の処理（関数）に届く前、
# またはレスポンスが返される直前に共通で実行したい処理を記述します。

import os
from starlette.middleware.base import BaseHTTPMiddleware

# 【セキュリティヘッダーミドルウェア】
# ブラウザのセキュリティ機能を強制的にONにするための設定です。
# 悪いWEBサイトがあなたのサイトを勝手に iframe で読み込んで操作を盗む（クリックジャッキング）などを防ぎます。
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        # クリックジャッキング対策: 自分のサイト以外で iframe 表示を禁止
        response.headers["X-Frame-Options"] = "DENY"
        # MIMEタイプのスニッフィング防止: ブラウザが勝手にファイル形式を推測して実行するのを防ぐ
        response.headers["X-Content-Type-Options"] = "nosniff"
        # XSSフィルタの有効化: ブラウザの組み込みXSS対策を強制
        response.headers["X-XSS-Protection"] = "1; mode=block"
        # HSTS (HTTPS強制): 1年間、このドメインへはHTTPSのみで接続するようにブラウザに指示（本番のみ）
        if os.getenv("ENV") == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# 【CORS (Cross-Origin Resource Sharing) の設定】
# 「違うドメインのフロントエンド」から「このバックエンドAPI」を叩くことを許可するための設定です。
# これがないと、ブラウザのセキュリティ制限でフロントエンドからのAPI呼び出しがブロックされます。
cors_origins_env = os.getenv("CORS_ORIGINS", "").strip()
if cors_origins_env:
    # 環境変数がある場合（本番など）、カンマ区切りで複数のドメインを許可
    # 空白を除去し、空文字があれば無視する
    origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
    logger.info(f"CORS origins configured: {origins}")
else:
    # 開発環境用のデフォルト許可リスト
    origins = [
        "http://localhost",
        "http://localhost:5173",  # Vite のデフォルトポート
        "https://localhost",
        "http://127.0.0.1",
        "http://127.0.0.1:5173",
        "https://127.0.0.1",
    ]

# CORS ミドルウェアをアプリケーションに追加
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # 許可するサイトのURL
    allow_credentials=True,      # クッキーなどを使った認証を許可するか
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"], # 許可するHTTPメソッド
    allow_headers=["*"],         # 全てのヘッダーを許可（認証トークンなどを送るため）
)

# ----------------------------------------------------------------------
# 4. ルーティングのインクルード
# ----------------------------------------------------------------------

# 外部ファイル (routers/todos.py) で定義されたエンドポイントを組み込む
app.include_router(auth.router)
app.include_router(todos.router)
app.include_router(ai.router)