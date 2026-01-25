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
