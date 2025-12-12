from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession # 非同期エンジンと非同期セッションをインポート
from sqlalchemy.orm import sessionmaker, declarative_base          # セッション作成関数と宣言的基底クラスをインポート
from typing import AsyncGenerator                                  # get_db関数の戻り値の型ヒントのためにインポート
import os                                                          # 環境変数を読み込むためにインポート
import logging                                                   # ロギングをインポート


# 環境変数からデータベース接続URLを取得
# (例: "postgresql+asyncpg://user:password@host/dbname")
DATABASE_URL = os.getenv("DATABASE_URL")

# 💡 ここで環境変数の値を確認する
if DATABASE_URL is None:
    logging.error("致命的なエラー: 環境変数 'DATABASE_URL' がコンテナ内で見つかりませんでした。")
    # Noneのままengineを作成するとエラーになるため、ここで処理を停止
    raise ValueError("DATABASE_URLが設定されていません。")
else:
    logging.info(f"データベースURLが正常にロードされました: {DATABASE_URL[:20]}...")

# データベース接続エンジンを作成
# 1. create_async_engine: 非同期処理用のエンジンを作成
# 2. DATABASE_URL: 接続文字列を指定
# 3. echo=True: 実行されるSQL文をコンソールに出力（デバッグ用途。本番環境ではFalse推奨）
engine = create_async_engine(DATABASE_URL, echo=True)

# ----------------- セッション管理 -----------------

# 非同期セッションファクトリを作成
# 1. sessionmaker: セッションを作成するためのクラスを作成
# 2. engine: 接続エンジンを指定
# 3. class_=AsyncSession: 作成するセッションクラスとして非同期セッションを指定
# 4. expire_on_commit=False: コミット後にオブジェクトを期限切れにしない設定（非同期処理ではFalseが一般的）
AsyncSessionLocal = sessionmaker(
    bind=engine,                         # どのエンジンに接続するか
    class_=AsyncSession,                 # 使用するセッションクラス
    expire_on_commit=False,              # コミット後もオブジェクトをメモリに残す
)

# 宣言的な基底クラスを作成
# 全てのモデル（テーブル）が継承するクラス
Base = declarative_base()

# ----------------- 依存性注入用関数 -----------------

# データベースセッションを非同期ジェネレータとして提供する関数
# 主にFastAPIなどの依存性注入システムで使用される
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    非同期データベースセッションを提供し、スコープを抜ける際に自動的に閉じるジェネレータ。
    async withブロックにより、自動的にセッションが閉じられます。
    """
    async with AsyncSessionLocal() as session:
        # セッションを呼び出し元に提供 (yield)
        yield session
        # async withブロックの終了時に自動的にセッションが閉じられます