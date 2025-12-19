import asyncio
from httpx import AsyncClient, ASGITransport
import os
import sys

# Set env before importing app
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["TESTING"] = "true"

from app.main import app
from app.database import Base, engine

async def test():
    # Initialize DB
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        print("Registering...")
        response = await client.post(
            "/auth/register",
            json={"email": "test@example.com", "password": "password123"},
        )
        print(f"Status: {response.status_code}")
        print(f"Body: {response.text}")

if __name__ == "__main__":
    asyncio.run(test())
