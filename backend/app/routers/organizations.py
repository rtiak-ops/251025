from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from .. import crud, models, schemas, dependencies
from ..database import get_db

# 組織（テナント）管理用のルーター
router = APIRouter(prefix="/organizations", tags=["Organizations"])

@router.post("/", response_model=schemas.OrganizationOut)
async def create_organization(
    org: schemas.OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    """
    新しい組織を作成し、作成したユーザーをその組織の所属（および管理者候補）として紐付けます。
    
    【制限】
    - 既に組織に所属しているユーザーは新しい組織を作成できません。
    """
    # 既に組織に所属しているかチェック
    if current_user.organization_id:
        raise HTTPException(status_code=400, detail="すでに組織に所属しています。")
    
    from sqlalchemy.exc import IntegrityError
    try:
        # CRUD処理で組織レコードを作成
        db_org = await crud.create_organization(db, org)
        
        # 【法人確認シミュレーション】
        # 法人番号（13桁）が入力されていれば、簡易的に「認証済み」ステータスにする
        if org.corporate_id and len(org.corporate_id) == 13:
            db_org.is_verified = True
            db.add(db_org)
            await db.commit()
            await db.refresh(db_org)
            
    except IntegrityError:
        # 名称や法人番号の重複エラー
        raise HTTPException(status_code=409, detail="その名称または法人番号は既に登録されています。")
    except Exception as e:
        raise e
    
    # 組織作成者をその組織に紐付ける（最初の所属メンバーにする）
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
    ログイン中のユーザーが現在所属している組織の詳細情報を取得します。
    """
    if not current_user.organization_id:
        raise HTTPException(status_code=404, detail="組織に所属していません。")
    
    # DBから組織情報を取得
    org = await crud.get_organization(db, current_user.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="組織が見つかりません。")
    return org
