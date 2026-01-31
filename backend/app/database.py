from __future__ import annotations
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .core.config import DATABASE_URL, DEBUG, ENV

# データベース接続用の非同期エンジンを作成
# DEBUG=True かつ 本番環境以外の場合、SQLログを出力（echo=True）
is_echo = DEBUG and ENV != "production"

# SQLite（テスト環境等）では受け付けない引数があるため、Postgresの場合のみ追加引数を設定
connect_args = {}
if DATABASE_URL.startswith("postgresql"):
    connect_args = {
        "command_timeout": 15,    # クエリのタイムアウト（秒）
        "timeout": 10             # 接続自体のタイムアウト（秒）
    }

engine = create_async_engine(
    DATABASE_URL, 
    echo=is_echo,
    connect_args=connect_args
)

# 非同期DBセッションを作成するためのファクトリ（AsyncSessionLocal）を定義
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False, # コミット後もインスタンス属性にアクセス可能にする（推奨設定）
)

# モデルクラスが継承する基底クラスを定義
Base = declarative_base()

# FastAPIの各種エンドポイントでDBセッションを依存性注入として受け取るための関数
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    リクエストごとに新しい非同期DBセッションを生成し、
    処理が完了したら自動的にクローズします。
    """
    async with AsyncSessionLocal() as session:
        yield session