# 必要なライブラリとモジュールのインポート
from contextlib import asynccontextmanager  # ライフサイクル管理のための Context Manager をインポート
from fastapi import FastAPI                 # FastAPI のメインクラスをインポート
from fastapi.middleware.cors import CORSMiddleware # CORSミドルウェアをインポート
# アプリケーション固有のモジュールをインポート
from .routers import todos, auth                  # ToDo関連のエンドポイント（ルーター）をインポート
from .database import engine, Base          # データベース接続エンジンと、モデルのベースクラスをインポート

# ----------------------------------------------------------------------
# 1. アプリケーションのライフサイクル管理 (起動/終了時の処理)
# ----------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI の起動時と終了時に実行される処理を定義します。
    yield までの処理が起動時 (startup)、yield 以降の処理が終了時 (shutdown) に実行されます。
    """
    print("アプリケーション起動: データベース初期化を開始します。")
    try:
        # データベースエンジンを使用して非同期セッションを開始
        async with engine.begin() as conn:
            # データベースのスキーマ (テーブル) を作成 (存在しない場合のみ作成されます)
            await conn.run_sync(Base.metadata.create_all)
        print("データベース初期化が完了しました。")
    except Exception as e:
        print(f"データベース初期化中にエラーが発生しました: {e}")
        # 実際にはここで適切なエラーハンドリングを行うべきです

    # ここでアプリケーション本体が起動し、リクエストの処理が可能になります
    yield

    # ------------------------------------
    # アプリケーション終了時の処理 (shutdown)
    # ------------------------------------
    print("アプリケーション終了処理を実行します。")
    # ここにクリーンアップ処理 (例: データベース接続プールを閉じるなど) を記述できます
    # await engine.dispose()  # 必要に応じて

# ----------------------------------------------------------------------
# 2. FastAPI アプリケーションインスタンスの作成
# ----------------------------------------------------------------------

# lifespan 引数に定義した Context Manager を渡し、起動/終了処理を組み込む
app = FastAPI(title="Async FastAPI ToDo App", lifespan=lifespan)

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