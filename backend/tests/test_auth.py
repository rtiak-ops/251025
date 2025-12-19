import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    """ユーザー登録のテスト"""
    unique_email = "test_user@example.com"
    # パスワードは schemas.py の制限に従い 8文字以上に設定
    payload = {"email": unique_email, "password": "password123"}
    
    response = await client.post("/auth/register", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == unique_email
    assert "id" in data

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """ログイン成功のテスト"""
    email = "login_success@example.com"
    password = "password123"
    
    # 登録
    await client.post("/auth/register", json={"email": email, "password": password})
    
    # ログイン (JSON形式で送信)
    response = await client.post("/auth/login", json={"email": email, "password": password})
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_failure(client: AsyncClient):
    """ログイン失敗のテスト"""
    email = "login_fail@example.com"
    password = "password123"
    
    await client.post("/auth/register", json={"email": email, "password": password})
    
    # 間違ったパスワード
    response = await client.post("/auth/login", json={"email": email, "password": "wrongpassword"})
    
    assert response.status_code == 401