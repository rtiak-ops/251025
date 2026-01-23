from __future__ import annotations
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .core.config import DATABASE_URL, DEBUG, ENV

# データベース接続エンジンの作成
is_echo = DEBUG and ENV != "production"
engine = create_async_engine(DATABASE_URL, echo=is_echo)

# 非同期セッションファクトリの作成
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# 宣言的な基底クラス
Base = declarative_base()

# 依存性注入用関数
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """非同期DBセッションを提供し自動で閉じる"""
    async with AsyncSessionLocal() as session:
        yield session