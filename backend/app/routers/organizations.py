from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from .. import crud, models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/organizations", tags=["Organizations"])

@router.post("/", response_model=schemas.OrganizationOut)
async def create_organization(
    org: schemas.OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    新しい組織を作成し、作成者をその組織に紐づけます。
    """
    if current_user.organization_id:
        raise HTTPException(status_code=400, detail="すでに組織に所属しています。")
    
    db_org = await crud.create_organization(db, org)
    
    # ユーザーを組織に紐付ける
    current_user.organization_id = db_org.id
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    
    return db_org

@router.get("/me", response_model=schemas.OrganizationOut)
async def get_my_organization(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    自分が所属している組織の情報を取得します。
    """
    if not current_user.organization_id:
        raise HTTPException(status_code=404, detail="組織に所属していません。")
    
    org = await crud.get_organization(db, current_user.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="組織が見つかりません。")
    return org
