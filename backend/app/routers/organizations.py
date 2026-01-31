from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, dependencies, models, schemas
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
        existing_org = await crud.get_organization(db, current_user.organization_id)
        if existing_org:
            raise HTTPException(status_code=400, detail="すでに組織に所属しています。既存の組織を退会するか削除してから新しく作成してください。")
        else:
            # 紐付けが壊れている場合はクリア
            current_user.organization_id = None
            db.add(current_user)
            await db.commit()
            await db.refresh(current_user)
    
    import logging

    from sqlalchemy.exc import IntegrityError
    logger = logging.getLogger(__name__)

    try:
        # バリデーション: 空文字列を None に変換（ユニーク制約エラー防止）
        org_data = org.model_dump()
        if not org_data.get('corporate_id') or org_data['corporate_id'].strip() == '':
            org_data['corporate_id'] = None
        if not org_data.get('website') or org_data['website'].strip() == '':
            org_data['website'] = None
        
        # 1. 組織レコードの作成（まだコミットしない）
        db_org = models.Organization(
            name=org_data['name'].strip(),
            corporate_id=org_data['corporate_id'],
            website=org_data['website'],
            plan=org_data.get('plan', 'free')
        )
        
        # 【法人確認シミュレーション】
        if db_org.corporate_id and len(db_org.corporate_id) == 13:
            db_org.is_verified = True
            
        db.add(db_org)
        await db.flush() # IDを確定させるために一時反映（コミットはしない）
        
        logger.info(f"組織準備完了: {db_org.name} (ID: {db_org.id})")

        # 2. 作成者を管理者に昇格し、組織に紐付ける
        current_user.organization_id = db_org.id
        current_user.role = "admin"
        db.add(current_user)
        
        # 3. まとめてコミット（どちらかが失敗すればロールバックされる）
        await db.commit()
        await db.refresh(db_org)
        await db.refresh(current_user)
        
        logger.info(f"組織の完全登録完了: {db_org.name}, 管理者: {current_user.email}")
        return db_org

    except IntegrityError as e:
        await db.rollback()
        error_info = str(e.orig) if hasattr(e, 'orig') else str(e)
        logger.warning(f"組織登録の競合: {error_info}")
        if "organizations_name_key" in error_info or "unique constraint" in error_info.lower():
             raise HTTPException(status_code=409, detail="その組織名は既に登録されている可能性があります。別の名称を試してください。") from e
        raise HTTPException(status_code=409, detail="入力された組織名または法人番号は既に使用されています。") from e
    except Exception as e:
        await db.rollback()
        logger.error(f"組織登録における予期せぬエラー: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"サーバー側でエラーが発生しました: {str(e)}") from e

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
@router.patch("/me", response_model=schemas.OrganizationOut)
async def update_my_organization(
    org_update: schemas.OrganizationUpdate,
    current_user: models.User = Depends(dependencies.admin_required),
    db: AsyncSession = Depends(get_db)
):
    """
    ログイン中の管理者が所属する組織の情報を更新します。
    """
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="組織に所属していません。")
    
    db_org = await crud.update_organization(db, current_user.organization_id, org_update)
    if not db_org:
        raise HTTPException(status_code=404, detail="組織が見つかりません。")
    return db_org

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_organization(
    current_user: models.User = Depends(dependencies.admin_required),
    db: AsyncSession = Depends(get_db)
):
    """
    ログイン中の管理者が所属する組織を削除します。
    関連するプロジェクトやデータもカスケード削除されます。
    """
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="組織に所属していません。")
    
    success = await crud.delete_organization(db, current_user.organization_id)
    if not success:
        raise HTTPException(status_code=404, detail="組織が見つかりません。")
    
    # 管理者自身の組織紐付けとロールをリセット（オプション、SET NULLが効くがフロントエンドに伝えやすくするため）
    current_user.organization_id = None
    current_user.role = "user"
    db.add(current_user)
    await db.commit()
    
    return None

@router.post("/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_organization(
    current_user: models.User = Depends(dependencies.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    所属している組織から退会します。
    管理者（Admin）の場合、組織内に他の管理者が存在する必要があります。
    自分が最後の管理者の場合は、退会前に権限を譲渡するか、組織を削除する必要があります。
    """
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="組織に所属していません。")
    
    # 管理者チェック: 最後の管理者の場合は退会不可
    if current_user.role == "admin":
        from sqlalchemy import func, select

        from ..models import User
        # 同組織内の他の管理者の数を数える
        admin_count_stmt = select(func.count(User.id)).where(
            User.organization_id == current_user.organization_id,
            User.role == "admin"
        )
        admin_count = (await db.execute(admin_count_stmt)).scalar()
        
        if admin_count <= 1:
            raise HTTPException(
                status_code=400, 
                detail="あなたが最後の管理者のため、退会できません。先に他のユーザーを管理者に昇格させるか、組織自体を削除してください。"
            )

    # ユーザーの組織紐付けとロールをリセット
    current_user.organization_id = None
    current_user.role = "user"
    db.add(current_user)
    await db.commit()
    
    return None
