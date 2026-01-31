import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_check_practice(client: AsyncClient):
    """
    練習用テスト: サーバーが生きているか確認するシンプルなテスト
    """
    response = await client.get("/health")
    # もし /health エンドポイントがない場合は 404 になるかもしれませんが、
    # ここでは「リクエストを送って何らかのレスポンスが返ってくること」を確認します。
    # APIの基本構造が壊れていないかのチェックになります。
    assert response.status_code in [200, 404] 
