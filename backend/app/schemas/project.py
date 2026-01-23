from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ProjectBase(BaseModel):
    """
    プロジェクトの基本情報を定義するスキーマ。
    """
    name: str                       # プロジェクト名 (必須)
    description: str | None = None  # プロジェクトの説明 (任意)

class ProjectCreate(ProjectBase):
    """
    プロジェクト新規作成用のスキーマ。
    """
    pass

class ProjectUpdate(BaseModel):
    """
    プロジェクト情報更新用のスキーマ。全項目が任意。
    """
    name: str | None = None         # プロジェクト名
    description: str | None = None  # 説明

class CollaboratorBase(BaseModel):
    """
    共同作業者の基本情報を定義するスキーマ。
    """
    user_id: int                    # ユーザーID
    permission: str = "editor"      # 権限 (デフォルト: "editor")

class CollaboratorCreate(CollaboratorBase):
    """
    共同作業者追加用のスキーマ。
    """
    pass

class CollaboratorOut(CollaboratorBase):
    """
    APIから返却される共同作業者のデータ構造。
    """
    id: int                         # インデックスID
    user_email: str | None = None   # フロントエンド表示用のメールアドレス
    
    model_config = ConfigDict(from_attributes=True)

class ProjectOut(ProjectBase):
    """
    APIから返却されるプロジェクト情報のフルセット。
    """
    id: int                         # プロジェクトID
    created_at: datetime            # 作成日時
    updated_at: datetime            # 更新日時
    owner_id: int                   # オーナーのユーザーID
    organization_id: int | None = None # 所属組織ID
    collaborators: list[CollaboratorOut] = [] # 共同作業者のリスト
    
    model_config = ConfigDict(from_attributes=True)

class ProjectSummary(ProjectOut):
    """
    ダッシュボード用などのプロジェクトサマリー
    """
    todo_count: int = 0
    completed_count: int = 0
    role: str | None = None
