from __future__ import annotations
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from .. import models, schemas

async def create_organization(db: AsyncSession, org: schemas.OrganizationCreate) -> models.Organization:
    """
    新しい組織を作成しデータベースに保存します。

    Args:
        db (AsyncSession): データベースセッション
        org (schemas.OrganizationCreate): 作成する組織の情報（スキーマ）

    Returns:
        models.Organization: 作成された組織のモデルインスタンス
    """
    # スキーマデータをモデルに変換してインスタンス化
    db_org = models.Organization(**org.model_dump())
    # データベースに追加
    db.add(db_org)
    # 変更を確定
    await db.commit()
    # データベースの状態を反映（IDなどの自動生成値を読み込む）
    await db.refresh(db_org)
    return db_org

async def get_organization(db: AsyncSession, org_id: int) -> models.Organization | None:
    """
    IDを指定して組織情報を取得します。

    Args:
        db (AsyncSession): データベースセッション
        org_id (int): 取得したい組織のID

    Returns:
        models.Organization | None: 見つかった組織のモデル、存在しない場合は None
    """
    # IDに一致する組織を検索するクエリを実行
    result = await db.execute(select(models.Organization).where(models.Organization.id == org_id))
    # 最初に見つかった1件を返す（見つからない場合は None）
    return result.scalar_one_or_none()
async def update_organization(
    db: AsyncSession, org_id: int, org_update: schemas.OrganizationUpdate
) -> models.Organization | None:
    """
    指定されたIDの組織情報を更新します。
    """
    db_org = await get_organization(db, org_id)
    if not db_org:
        return None
    
    update_data = org_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_org, key, value)
    
    db.add(db_org)
    await db.commit()
    await db.refresh(db_org)
    return db_org

async def delete_organization(db: AsyncSession, org_id: int) -> bool:
    """
    指定されたIDの組織を削除します。
    """
    db_org = await get_organization(db, org_id)
    if not db_org:
        return False
    
    await db.delete(db_org)
    await db.commit()
    return True
