from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from ..database import Base


class AuditLog(Base):
    """
    システムの操作履歴（監査ログ）を管理するデータベースモデルです。
    誰が、いつ、どのアクションを、どのリソースに対して行ったかを記録します。
    """
    __tablename__ = "audit_logs"

    # プライマリキー
    id = Column(Integer, primary_key=True, index=True)
    # 操作を行ったユーザーのID（SET NULL: ユーザー削除後もログを保持）
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    # 実行されたアクション（login, create, update, delete 等）
    action = Column(String(50), nullable=False)
    # 対象リソースの種類（project, todo, organization 等）
    resource_type = Column(String(50), nullable=False)
    # 対象リソースのID
    resource_id = Column(Integer, nullable=True)
    # 操作の詳細内容（JSON文字列等）
    details = Column(Text, nullable=True)
    # ログ記録日時（UTC）
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    
    # 関連組織のID（組織単位でのログ抽出用）
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)

    # リレーションシップ: 操作を行ったユーザー
    user = relationship("User")
