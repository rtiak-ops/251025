# 必要なライブラリとモジュールのインポート
import logging
import sys
from contextlib import asynccontextmanager  # ライフサイクル管理のための Context Manager をインポート
from fastapi import FastAPI, Request                 # FastAPI のメインクラスをインポート
from fastapi.middleware.cors import CORSMiddleware # CORSミドルウェアをインポート
from pythonjsonlogger import jsonlogger # JSONロガー
from slowapi import Limiter, _rate_limit_exceeded_handler # Rate Limiting
from slowapi.util import get_remote_address # Rate Limiting
from slowapi.errors import RateLimitExceeded # Rate Limiting
from slowapi.middleware import SlowAPIMiddleware # Rate Limiting

# アプリケーション固有のモジュールをインポート
from .routers import todos, auth, ai                # ToDo関連のエンドポイント（ルーター）をインポート
from .database import engine, Base          # データベース接続エンジンと、モデルのベースクラスをインポート

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
formatter = jsonlogger.JsonFormatter(
    "%(asctime)s %(levelname)s %(name)s %(message)s",
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
# 3. CORS (Cross-Origin Resource Sharing) の設定
# ----------------------------------------------------------------------

# 許可するオリジンのリストを設定（フロントエンドのURL）
origins = [
    "http://localhost:5173",  # よくあるフロントエンド開発サーバーポート
    "http://localhost:3000"   # よくあるフロントエンド開発サーバーポート
    # "https://your-production-domain.com" # 本番環境のドメインも追加
]

# CORS ミドルウェアをアプリケーションに追加し、異なるオリジンからのアクセスを許可
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # 許可するオリジン
    allow_credentials=True,      # クッキーなどの資格情報を許可
    allow_methods=["*"],         # 全てのHTTPメソッド (GET, POST, etc.) を許可
    allow_headers=["*"],         # 全てのHTTPヘッダーを許可
)

# ----------------------------------------------------------------------
# 4. ルーティングのインクルード
# ----------------------------------------------------------------------

# 外部ファイル (routers/todos.py) で定義されたエンドポイントを組み込む
app.include_router(auth.router)
app.include_router(todos.router)
app.include_router(ai.router)