import pytest

@pytest.mark.asyncio
async def test_register_user(client):
    unique_email = "test@example.com"
    response = await client.post(
        "/auth/register",
        json={"email": unique_email, "password": "password123", "username": unique_email},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == unique_email
    assert "id" in data
    assert "password" not in data

@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    email = "duplicate@example.com"
    # 1回目の登録
    await client.post(
        "/auth/register",
        json={"email": email, "password": "password123", "username": email},
    )
    # 2回目の登録
    response = await client.post(
        "/auth/register",
        json={"email": email, "password": "password123", "username": email},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "このメールアドレスは既に登録されています"

@pytest.mark.asyncio
async def test_login_success(client):
    email = "login@example.com"
    password = "password123"
    await client.post(
        "/auth/register",
        json={"email": email, "password": password, "username": email},
    )
    # ログインは「data=」で「username」として送る
    response = await client.post(
        "/auth/login",
        data={"username": email, "password": password},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_failure(client):
    email = "fail@example.com"
    password = "password123"
    await client.post(
        "/auth/register",
        json={"email": email, "password": password, "username": email},
    )
    response = await client.post(
        "/auth/login",
        data={"username": email, "password": "wrongpassword"},
    )
    assert response.status_code == 401