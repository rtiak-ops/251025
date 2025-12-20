# 必要なライブラリとモジュールのインポート
from __future__ import annotations  # Python 3.10+: 型ヒントの前方参照を簡潔に

import logging
import sys
import os
from contextlib import asynccontextmanager  # ライフサイクル管理のための Context Manager をインポート
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
    """
    FastAPI の起動時と終了時に実行される処理を定義します。
    yield までの処理が起動時 (startup)、yield 以降の処理が終了時 (shutdown) に実行されます。
    """
    logger.info("アプリケーション起動: データベース初期化を開始します。")
    try:
        # データベースエンジンを使用して非同期セッションを開始
        async with engine.begin() as conn:
            # データベースのスキーマ (テーブル) を作成 (存在しない場合のみ作成されます)
            await conn.run_sync(Base.metadata.create_all)
        logger.info("データベース初期化が完了しました。")
    except Exception as e:
        logger.error(f"データベース初期化中にエラーが発生しました: {e}", exc_info=True)
        # 実際にはここで適切なエラーハンドリングを行うべきです

    # ここでアプリケーション本体が起動し、リクエストの処理が可能になります
    yield

    # ------------------------------------
    # アプリケーション終了時の処理 (shutdown)
    # ------------------------------------
    logger.info("アプリケーション終了処理を実行します。")
    # ここにクリーンアップ処理 (例: データベース接続プールを閉じるなど) を記述できます
    # await engine.dispose()  # 必要に応じて

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
# 3. Middleware: Security Headers & CORS
# ----------------------------------------------------------------------

import os
from starlette.middleware.base import BaseHTTPMiddleware

# セキュリティヘッダーを追加するカスタムミドルウェア
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        # クリックジャッキング対策
        response.headers["X-Frame-Options"] = "DENY"
        # MIMEタイプのスニッフィング防止
        response.headers["X-Content-Type-Options"] = "nosniff"
        # XSSフィルタの有効化
        response.headers["X-XSS-Protection"] = "1; mode=block"
        # HSTS (HTTPS強制) - 本番環境のみ推奨
        if os.getenv("ENV") == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# 許可するオリジンのリストを設定（フロントエンドのURL）
# 環境変数 CORS_ORIGINS があればそれを使用し、なければデフォルト値を使用します。
# カンマ区切りで複数指定可能です（例: "https://example.com,https://www.example.com"）
cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    origins = [origin.strip() for origin in cors_origins_env.split(",")]
else:
    origins = [
        "http://localhost",
        "http://localhost:5173",  # Vite 開発サーバー
        "https://localhost",
        "http://127.0.0.1",
        "http://127.0.0.1:5173",
        "https://127.0.0.1",
    ]

# CORS ミドルウェアをアプリケーションに追加し、異なるオリジンからのアクセスを許可
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # 許可するオリジン
    # allow_origin_regex="https?://localhost:.*", # 開発用でも必要以上に広げない
    allow_credentials=True,      # クッキーなどの資格情報を許可
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"], # 必要なメソッドのみ許可
    allow_headers=["*"],         # 全てのHTTPヘッダーを許可
)

# ----------------------------------------------------------------------
# 4. ルーティングのインクルード
# ----------------------------------------------------------------------

# 外部ファイル (routers/todos.py) で定義されたエンドポイントを組み込む
app.include_router(auth.router)
app.include_router(todos.router)
app.include_router(ai.router)