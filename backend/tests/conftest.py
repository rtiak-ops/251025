"""
【conftest.py とは？】
pytestが自動的に読み込む特別な設定ファイルです。
ここに書いた「fixture（フィクスチャ）」は、すべてのテストファイルから使えるようになります。

【このファイルの役割】
テストを実行するための「準備」と「後片付け」を自動化します。
具体的には：
  1. テスト用のデータベースを用意する
  2. テスト用のHTTPクライアントを用意する
  3. テストが終わったら、データをきれいに削除する

これにより、各テストファイルで同じ準備コードを書く必要がなくなります！
"""

from __future__ import annotations  # Python 3.10+: 型ヒントの前方参照を簡潔に

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


# ============================================================
# テスト用データベースの設定
# ============================================================
# 【なぜテスト用のDBが必要？】
# 本番のPostgreSQLを使ってテストすると、テストデータが本番データに混ざってしまいます。
# そこで、テスト専用の「使い捨てデータベース」を用意します。
#
# 【SQLiteのメモリモードとは？】
# `:memory:` を指定すると、データベースがメモリ上（RAM上）に作られます。
# つまり、ファイルとして保存されず、プログラムが終了すると自動的に消えます。
#
# 【メリット】
#  1. 高速: ディスクアクセスがないため、テストが爆速で終わります 🚀
#  2. 独立性: 本番DBを汚さず、テスト後にデータを消す手間が不要です
#  3. 手軽さ: PostgreSQLサーバーを立ち上げる必要がありません
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# 【エンジンの作成】
# データベースに接続するための「エンジン」を作ります。
# エンジンは、SQLAlchemyがDBと通信するための窓口のようなものです。
engine = create_async_engine(
    TEST_DATABASE_URL,
    # SQLiteは本来シングルスレッド用ですが、非同期処理で使うためにこの設定が必要です
    connect_args={"check_same_thread": False},
    # メモリ内DBの接続を維持するための設定（接続が切れるとデータが消えるため）
    poolclass=StaticPool,
)

# 【セッションメーカーの作成】
# データベースとやり取りするための「セッション」を作る工場のようなものです。
# セッションは、DBへの読み書きをまとめて管理してくれます。
TestingSessionLocal = sessionmaker(
    class_=AsyncSession,  # 非同期処理用のセッション
    autocommit=False,     # 自動コミットしない（明示的にcommitを呼ぶまで確定しない）
    autoflush=False,      # 自動フラッシュしない（明示的にflushを呼ぶまでDBに送らない）
    bind=engine           # 上で作ったエンジンに紐づける
)


# ============================================================
# Fixture 1: db_session（テスト用DBセッション）
# ============================================================
@pytest.fixture(scope="function")
async def db_session():
    """
    【このfixtureの役割】
    テスト関数が実行されるたびに、新しいデータベースセッションを提供します。
    
    【fixtureとは？】
    pytestの便利機能で、テスト関数の引数に書くだけで自動的に実行されます。
    例: `async def test_something(db_session):` と書けば、
        この関数が自動で呼ばれて、db_sessionが渡されます。
    
    【scope="function" の意味】
    テスト関数1つごとに、この処理が実行されます。
    つまり、各テストは完全に独立した、まっさらなDBで実行されます。
    
    【処理の流れ】
    1. テスト開始前: テーブルを作成（create_all）
    2. テスト実行中: セッションをテストに渡す（yield）
    3. テスト終了後: テーブルを削除（drop_all）
    
    【なぜ毎回削除するの？】
    前のテストのデータが残っていると、次のテストに影響が出てしまいます。
    毎回削除することで、テストの独立性を保ちます。
    """
    # ステップ1: テーブルを作成
    # engine.begin() で接続を開始し、Base.metadata.create_all でテーブルを作ります
    async with engine.begin() as conn:
        # run_sync: 非同期コンテキストで同期関数を実行するためのヘルパー
        await conn.run_sync(Base.metadata.create_all)
    
    # ステップ2: セッションを作成してテストに渡す
    async with TestingSessionLocal() as session:
        # yield: ここでテスト関数にセッションを渡します
        # テスト関数が終わるまで、ここで処理が一時停止します
        yield session
        # テスト終了後、ここから処理が再開されます
        
    # ステップ3: テーブルを削除（次のテストのためにクリーンアップ）
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# ============================================================
# Fixture 2: override_get_db（DB依存性のオーバーライド）
# ============================================================
@pytest.fixture(scope="function")
async def override_get_db(db_session):
    """
    【このfixtureの役割】
    FastAPIの「依存性注入」をテスト用にすり替えるための関数を作ります。
    
    【依存性注入とは？】
    FastAPIでは、エンドポイント関数の引数に `db: Session = Depends(get_db)` と書くと、
    自動的にDBセッションが渡されます。これを「依存性注入」と呼びます。
    
    【なぜすり替えが必要？】
    本番のコードでは `get_db` が本番のPostgreSQLに接続しますが、
    テストでは、上で作ったテスト用のSQLiteに接続したいです。
    そこで、`get_db` をテスト用の関数にすり替えます。
    
    【どうやってすり替える？】
    FastAPIの `app.dependency_overrides` という辞書に、
    「本番の関数 → テスト用の関数」という対応を登録します。
    """
    # テスト用のget_db関数を定義
    # この関数は、上で作った db_session を返すだけです
    async def _override_get_db():
        yield db_session
    
    # この関数を返す（次のfixtureで使います）
    return _override_get_db


# ============================================================
# Fixture 3: client（テスト用HTTPクライアント）
# ============================================================
@pytest.fixture(scope="function")
async def client(override_get_db):
    """
    【このfixtureの役割】
    FastAPIアプリにHTTPリクエストを送るための「テスト用クライアント」を提供します。
    
    【テスト用クライアントとは？】
    実際にサーバーを起動せず、アプリの処理を直接呼び出すクライアントです。
    `await client.post("/api/auth/register", json={...})` のように使えます。
    
    【処理の流れ】
    1. FastAPIの依存性注入をテスト用にすり替える
    2. テスト用クライアントを作成してテストに渡す
    3. テスト終了後、すり替えを解除して元に戻す
    
    【なぜ元に戻す必要がある？】
    すり替えたままだと、次のテストに影響が出る可能性があるためです。
    """
    # ステップ1: 依存性注入をすり替える
    # app.dependency_overrides は、「本番の関数 → テスト用の関数」を登録する辞書です
    # get_db（本番用）を override_get_db（テスト用）にすり替えます
    app.dependency_overrides[get_db] = override_get_db
    
    # ステップ2: テスト用クライアントを作成
    # ASGITransport: FastAPIアプリを直接呼び出すためのトランスポート
    transport = ASGITransport(app=app)
    # AsyncClient: 非同期HTTPクライアント（httpxライブラリ）
    # base_url="http://test" は、テスト用のダミーURLです
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        # yield: ここでテスト関数にクライアントを渡します
        yield c
    
    # ステップ3: すり替えを解除して元に戻す
    # clear() で、すべてのオーバーライドを削除します
    app.dependency_overrides.clear()

