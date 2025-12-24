import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    """
    正常系: 新規ユーザー登録ができることを確認
    """
    # 1. 準備 (Arrange): テストデータの作成
    unique_email = "test_user@example.com"
    payload = {"email": unique_email, "password": "password123"}
    
    # 2. 実行 (Act): 登録エンドポイントへPOSTリクエスト
    response = await client.post("/auth/register", json=payload)
    
    # 3. 検証 (Assert): レスポンスの確認
    assert response.status_code == 201, "ユーザー登録が成功し、201 Createdが返ること"
    data = response.json()
    assert data["email"] == unique_email, "登録したメールアドレスがレスポンスに含まれていること"
    assert "id" in data, "生成されたユーザーIDがレスポンスに含まれていること"

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """
    正常系: 正しい資格情報でログインし、トークンが取得できることを確認
    """
    # 1. 準備 (Arrange): 事前にユーザーを登録しておく
    email = "login_success@example.com"
    password = "password123"
    await client.post("/auth/register", json={"email": email, "password": password})
    
    # 2. 実行 (Act): ログインエンドポイントへPOSTリクエスト
    login_payload = {"email": email, "password": password}
    response = await client.post("/auth/login", json=login_payload)
    
    # 3. 検証 (Assert): トークンの発行を確認
    assert response.status_code == 200, "ログインに成功し、200 OKが返ること"
    data = response.json()
    assert "access_token" in data, "アクセストークンが発行されていること"
    assert data["token_type"] == "bearer", "トークンタイプが 'bearer' であること"

@pytest.mark.asyncio
async def test_login_failure(client: AsyncClient):
    """
    異常系: 誤ったパスワードでログインが拒否されることを確認
    """
    # 1. 準備 (Arrange): ユーザーを登録
    email = "login_fail@example.com"
    password = "password123"
    await client.post("/auth/register", json={"email": email, "password": password})
    
    # 2. 実行 (Act): 間違ったパスワードでログイン試行
    wrong_payload = {"email": email, "password": "wrongpassword"}
    response = await client.post("/auth/login", json=wrong_payload)
    
    # 3. 検証 (Assert): 認証エラーの確認
    assert response.status_code == 401, "認証失敗により、401 Unauthorizedが返ること"
    assert "access_token" not in response.json(), "失敗時はトークンが含まれないこと"