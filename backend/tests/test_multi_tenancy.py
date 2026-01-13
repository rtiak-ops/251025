import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_organization_and_association(client: AsyncClient):
    """
    正常系: 組織を作成し、ユーザーがその組織に自動的に紐付けられることを確認
    """
    email = "creator_unique@test.com"
    password = "password123"
    await client.post("/auth/register", json={"email": email, "password": password})
    login_res = await client.post("/auth/login", json={"email": email, "password": password})
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    org_payload = {"name": "Unique Corp 1", "corporate_id": "9999999999991"}
    response = await client.post("/organizations/", json=org_payload, headers=headers)
    assert response.status_code == 200
    
    me_res = await client.get("/organizations/me", headers=headers)
    assert me_res.status_code == 200
    # 作成した組織が自分に反映されていること
    assert me_res.json()["name"] == "Unique Corp 1"

@pytest.mark.asyncio
async def test_multi_tenancy_isolation(client: AsyncClient):
    """
    重要: 組織間のデータ隔離（マルチテナント）を確認
    """
    # 組織A
    email_a = "user_a_isolation_unique@test.com"
    await client.post("/auth/register", json={"email": email_a, "password": "password123"})
    login_a = await client.post("/auth/login", json={"email": email_a, "password": "password123"})
    headers_a = {"Authorization": f"Bearer {login_a.json()['access_token']}"}
    await client.post("/organizations/", json={"name": "Org A Unique"}, headers=headers_a)
    await client.post("/projects/", json={"name": "Project A"}, headers=headers_a)

    # 組織B
    email_b = "user_b_isolation_unique@test.com"
    await client.post("/auth/register", json={"email": email_b, "password": "password123"})
    login_b = await client.post("/auth/login", json={"email": email_b, "password": "password123"})
    headers_b = {"Authorization": f"Bearer {login_b.json()['access_token']}"}
    await client.post("/organizations/", json={"name": "Org B Unique"}, headers=headers_b)
    await client.post("/projects/", json={"name": "Project B"}, headers=headers_b)

    # 組織Aのユーザーは、組織Aのプロジェクトのみが見え、Bは見えないこと
    res_a = await client.get("/projects/", headers=headers_a)
    assert res_a.status_code == 200
    projects_a = res_a.json()
    assert any(p["name"] == "Project A" for p in projects_a)
    assert not any(p["name"] == "Project B" for p in projects_a)

    # 組織Bのユーザーは、組織Bのプロジェクトのみが見え、Aは見えないこと
    res_b = await client.get("/projects/", headers=headers_b)
    assert res_b.status_code == 200
    projects_b = res_b.json()
    assert any(p["name"] == "Project B" for p in projects_b)
    assert not any(p["name"] == "Project A" for p in projects_b)

@pytest.mark.asyncio
async def test_duplicate_organization_prevention(client: AsyncClient):
    """
    異常系: 同名組織の重複登録が防止されることを確認
    """
    email1 = "u1_dup_final@test.com"
    await client.post("/auth/register", json={"email": email1, "password": "password123"})
    l1 = await client.post("/auth/login", json={"email": email1, "password": "password123"})
    h1 = {"Authorization": f"Bearer {l1.json()['access_token']}"}
    await client.post("/organizations/", json={"name": "Duplicate Target Org"}, headers=h1)

    email2 = "u2_dup_final@test.com"
    await client.post("/auth/register", json={"email": email2, "password": "password123"})
    l2 = await client.post("/auth/login", json={"email": email2, "password": "password123"})
    h2 = {"Authorization": f"Bearer {l2.json()['access_token']}"}
    
    # すでに登録済みの名称で作成を試みる
    response = await client.post("/organizations/", json={"name": "Duplicate Target Org"}, headers=h2)
    assert response.status_code == 409
