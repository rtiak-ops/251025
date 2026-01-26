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
    # すでに組織に所属しているかチェック
    if current_user.organization_id:
        raise HTTPException(status_code=400, detail="すでに組織に所属しています。")
    
    from sqlalchemy.exc import IntegrityError
    import logging
    logger = logging.getLogger(__name__)

    try:
        # バリデーション: 空文字列を None に変換（ユニーク制約エラー防止）
        org_data = org.model_dump()
        if not org_data.get('corporate_id') or org_data['corporate_id'].strip() == '':
            org_data['corporate_id'] = None
        if not org_data.get('website') or org_data['website'].strip() == '':
            org_data['website'] = None
        
        # クリーンなデータで新しいスキーマオブジェクトを作成
        clean_org = schemas.OrganizationCreate(**org_data)
        
        # CRUD処理で組織レコードを作成
        db_org = await crud.create_organization(db, clean_org)
        
        # 【法人確認シミュレーション】
        # 法人番号（13桁）が入力されていれば、簡易的に「認証済み」ステータスにする
        if clean_org.corporate_id and len(clean_org.corporate_id) == 13:
            db_org.is_verified = True
            db.add(db_org)
            
        # 組織作成者をその組織に紐付ける（最初の所属メンバーにする）
        current_user.organization_id = db_org.id
        # 組織作成者を自動的に管理者(admin)に昇格させる
        current_user.role = "admin"
        db.add(current_user)
        
        # 最終的なコミット（組織の更新がある場合やユーザーの更新）
        await db.commit()
        await db.refresh(db_org)
        await db.refresh(current_user)
        
        logger.info(f"組織作成成功: {db_org.name} (作成者: {current_user.email})")
        return db_org

    except IntegrityError as e:
        await db.rollback()
        logger.warning(f"組織作成重複エラー: {str(e)}")
        raise HTTPException(status_code=409, detail="その名称または法人番号は既に登録されています。")
    except Exception as e:
        await db.rollback()
        logger.error(f"組織作成予期せぬエラー: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"システムエラーが発生しました: {str(e)}")

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
