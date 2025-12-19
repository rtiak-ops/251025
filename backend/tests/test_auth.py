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
    # HTTPのPOSTメソッドでユーザー情報を送信します
    response = await client.post(
        "/auth/register",
        json={"email": unique_email, "password": "password123", "username": unique_email},
    )
    
    # 結果の検証 (Assertion)
    # 201は「リソースの作成成功」を意味するステータスコードです
    assert response.status_code == 201
    
    data = response.json()
    # 登録した通りのメールアドレスが返ってきているか確認します
    assert data["email"] == unique_email
    # データベースで採番されたIDが存在するか確認します
    assert "id" in data
    # セキュリティ上の重要ポイント：パスワードが生データで返ってこないことを確認します
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
    # 同じ条件を作るために、まずは1人目のユーザーを作成します
    await client.post(
        "/auth/register",
        json={"email": email, "password": "password123", "username": email},
    )
    
    # 検証対象: 2回目の登録（同じメールアドレス）
    # 全く同じメールアドレスで再度登録を試みます
    response = await client.post(
        "/auth/register",
        json={"email": email, "password": "password123", "username": email},
    )
    
    # エラーになることを確認
    # 重複はクライアント側のリクエスト不備（400 Bad Request）として扱うのが一般的です
    assert response.status_code == 400
    # ユーザーに分かりやすいエラーメッセージが返っているかチェックします
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
    
    # 事前準備: ログイン対象のユーザーをあらかじめ登録しておきます
    await client.post(
        "/auth/register",
        json={"email": email, "password": password, "username": email},
    )
    
    # ログインリクエスト
    # 登録した情報を使い、正しい組み合わせでログインを試みます
    response = await client.post(
        "/auth/login",
        data={"username": email, "password": password},
    )
    
    # トークンが発行されたか確認
    # ログイン成功時は 200 OK が返ることを期待します
    assert response.status_code == 200
    data = response.json()
    # 今後の認証で使う「鍵（アクセストークン）」が返ってきていることが重要です
    assert "access_token" in data
    # トークンの種類が Bearer（標準的な形式）であることを確認します
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
        json={"email": email, "password": password, "username": email
        },
    )
    
    # 間違ったパスワードでログイン試行
    # 登録時とは異なるパスワードをわざと送信します
    response = await client.post(
        "/auth/login",
        data={"username": email, "password": "wrongpassword"},
    )
    
    # 認証エラーを確認
    # 401 Unauthorized は「あなたは誰か分からない、もしくは認証できない」というエラーです
    assert response.status_code == 401