import pytest
from app import schemas

# ----------------------------------------------------------------------
# 認証（Auth）機能のテスト
# ----------------------------------------------------------------------

@pytest.mark.asyncio
async def test_register_user(client):
    """
    【正常系】新規ユーザー登録のテスト
    
    期待する動作:
    1. 正しいデータでPOSTリクエストを送ると、201 Created が返ってくること。
    2. レスポンスに、登録したメールアドレスが含まれていること。
    3. レスポンスに、セキュリティのためパスワードが含まれて *いない* こと。
    """
    unique_email = "test@example.com"
    response = await client.post(
        "/auth/register",
        json={"email": unique_email, "password": "password123"},
    )
    # 結果の検証 (Assertion)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == unique_email
    assert "id" in data
    assert "password" not in data

@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    """
    【異常系】メールアドレス重複のテスト
    
    期待する動作:
    1. 既に登録済みのメールアドレスで登録しようとすると、400 Bad Request エラーになること。
    """
    email = "duplicate@example.com"
    
    # 事前準備: 1回目の登録（これは成功するはず）
    await client.post(
        "/auth/register",
        json={"email": email, "password": "password123"},
    )
    
    # 検証対象: 2回目の登録（同じメールアドレス）
    response = await client.post(
        "/auth/register",
        json={"email": email, "password": "password123"},
    )
    
    # エラーになることを確認
    assert response.status_code == 400
    assert response.json()["detail"] == "このメールアドレスは既に登録されています"

@pytest.mark.asyncio
async def test_login_success(client):
    """
    【正常系】ログイン成功のテスト
    
    期待する動作:
    1. 正しいメールとパスワードを送ると、200 OK が返ってくること。
    2. レスポンスにアクセストークン (access_token) が含まれていること。
    """
    email = "login@example.com"
    password = "password123"
    
    # 事前準備: ユーザー登録しておく
    await client.post(
        "/auth/register",
        json={"email": email, "password": password},
    )
    
    # ログインリクエスト
    response = await client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    
    # トークンが発行されたか確認
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_failure(client):
    """
    【異常系】ログイン失敗のテスト
    
    期待する動作:
    1. 間違ったパスワードを送ると、401 Unauthorized エラーになること。
    """
    email = "fail@example.com"
    password = "password123"
    
    # 事前準備: ユーザー登録
    await client.post(
        "/auth/register",
        json={"email": email, "password": password},
    )
    
    # 間違ったパスワードでログイン試行
    response = await client.post(
        "/auth/login",
        json={"email": email, "password": "wrongpassword"},
    )
    
    # 認証エラーを確認
    assert response.status_code == 401
