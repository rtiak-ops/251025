from __future__ import annotations
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from .. import models, schemas

async def create_organization(db: AsyncSession, org: schemas.OrganizationCreate) -> models.Organization:
    """
    新しい組織を作成する関数
    """
    db_org = models.Organization(**org.model_dump())
    db.add(db_org)
    await db.commit()
    await db.refresh(db_org)
    return db_org

async def get_organization(db: AsyncSession, org_id: int) -> models.Organization | None:
    result = await db.execute(select(models.Organization).where(models.Organization.id == org_id))
    return result.scalar_one_or_none()
