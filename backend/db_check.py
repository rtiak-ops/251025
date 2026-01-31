import asyncio
import os
import sys

# パスを追加
sys.path.append(os.getcwd())

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import Organization, User


async def check():
    async with AsyncSessionLocal() as db:
        # 組織の確認
        result = await db.execute(select(Organization))
        orgs = result.scalars().all()
        print(f"--- Organizations ({len(orgs)}) ---")
        for o in orgs:
            print(f"ID: {o.id}, Name: {o.name}, Created: {o.created_at}")
        
        # ユーザーの確認（組織に紐付いている人）
        result = await db.execute(select(User).where(User.organization_id.isnot(None)))
        users = result.scalars().all()
        print(f"\n--- Users with Organization ({len(users)}) ---")
        for u in users:
            print(f"Email: {u.email}, Org ID: {u.organization_id}, Role: {u.role}")

if __name__ == "__main__":
    asyncio.run(check())
