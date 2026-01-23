from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from .. import crud, models, schemas, dependencies
from ..database import get_db

router = APIRouter(prefix="/organizations", tags=["Organizations"])

@router.post("/", response_model=schemas.OrganizationOut)
async def create_organization(
    org: schemas.OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    """
    新しい組織を作成し、作成者をその組織に紐づけます。
    """
    if current_user.organization_id:
        raise HTTPException(status_code=400, detail="すでに組織に所属しています。")
    
    from sqlalchemy.exc import IntegrityError
    try:
        db_org = await crud.create_organization(db, org)
        
        # 簡易的な法人確認シミュレーション: 法人番号が入力されていれば Verified にする
        if org.corporate_id and len(org.corporate_id) == 13:
            db_org.is_verified = True
            db.add(db_org)
            await db.commit()
            await db.refresh(db_org)
            
    except IntegrityError:
        raise HTTPException(status_code=409, detail="その名称または法人番号は既に登録されています。")
    except Exception as e:
        raise e
    
    # ユーザーを組織に紐付ける
    current_user.organization_id = db_org.id
    db.add(current_user)
    await db.commit()
    
    return db_org

@router.get("/me", response_model=schemas.OrganizationOut)
async def get_my_organization(
    current_user: models.User = Depends(dependencies.get_current_user),
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
