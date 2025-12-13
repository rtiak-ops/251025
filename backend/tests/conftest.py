import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app

# 【テスト用データベース設定】
# テスト実行時には、本番のPostgreSQLではなく、メモリ上で動作するSQLiteを使用します。
# 
# メリット:
#  1. 高速: ディスクアクセスがないため、非常に高速にテストが終わります。
#  2. 独立性: 実際のDBを汚さないため、テスト後にデータを消す手間が省けます。
#  3. 手軽さ: 外部のDBサーバーを立ち上げる必要がありません。
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}, # SQLiteをマルチスレッド（非同期）で使うための設定
    poolclass=StaticPool, # メモリ内DB接続を維持するための設定
)
TestingSessionLocal = sessionmaker(class_=AsyncSession, autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
async def db_session():
    """
    【DBセッションFixture】
    テスト関数 (test_*) が実行されるたびに自動で呼ばれるセットアップ関数です。
    scope="function" なので、テスト関数1つごとに実行されます。
    
    1. テスト開始前にテーブルを作成 (create_all)
    2. セッションを作成してテストに渡す (yield)
    3. テスト終了後にテーブルを全削除 (drop_all)
    
    これにより、テストケース間でデータが混ざることなく、常にクリーンな状態でテストできます。
    """
    # テーブル作成
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestingSessionLocal() as session:
        yield session
        # 必要ならクリーンアップ
        
    # テーブル削除（次のテストのため）
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture(scope="function")
async def override_get_db(db_session):
    # FastAPIの依存性注入 (get_db) を、このテスト用セッションですり替えるための関数
    async def _override_get_db():
        yield db_session
    return _override_get_db

@pytest.fixture(scope="function")
async def client(override_get_db):
    """
    【テスト用HTTPクライアント】
    実際のHTTPリクエストを送る代わりに、アプリ内の処理を直接呼び出すクライアントです。
    これを使って `await client.post(...)` のようにAPIをテストできます。
    """
    # FastAPIの get_db を、テスト用のDBセッションを使うように強制的に上書き (Override) します
    app.dependency_overrides[get_db] = override_get_db
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    
    # テストが終わったら上書きを解除して元に戻します
    app.dependency_overrides.clear()
