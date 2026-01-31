from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditLogOut(BaseModel):
    """
    監査ログ出力用のスキーマ。
    """
    id: int                      # ログID
    user_id: int | None          # 操作を行ったユーザーのID
    user_email: str | None = None # 操作を行ったユーザーのメールアドレス
    action: str                  # 行われたアクションの種類
    resource_type: str           # 対象リソースの種類
    resource_id: int | None      # 対象リソースのID
    details: str | None          # 詳細情報
    created_at: datetime         # 記録日時

    model_config = ConfigDict(from_attributes=True)
