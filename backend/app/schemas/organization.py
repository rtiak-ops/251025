from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class OrganizationBase(BaseModel):
    """
    組織の基本情報を定義するスキーマ。
    """
    name: str                       # 組織名 (必須)
    corporate_id: str | None = None # 法人番号 (任意)
    website: str | None = None      # 組織のウェブサイトURL (任意)
    plan: str = "free"              # 契約プラン (デフォルト: "free")

class OrganizationCreate(OrganizationBase):
    """
    組織作成時に入力されるデータ構造。
    OrganizationBaseを継承。
    """
    pass

class OrganizationOut(OrganizationBase):
    """
    APIから返却される組織情報のデータ構造。
    """
    id: int               # 組織を一意に識別するID
    is_verified: bool     # 確認済み組織かどうかのフラグ
    created_at: datetime  # 登録日時
    
    model_config = ConfigDict(from_attributes=True)
