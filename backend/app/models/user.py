from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from ..database import Base


class User(Base):
    """
    ユーザー情報を管理するデータベースモデルです。
    認証、権限管理、および各リソースとの所有関係を定義します。
    """
    __tablename__ = "users"

    # プライマリキー
    id = Column(Integer, primary_key=True, index=True)
    # メールアドレス（ログイン用ID、ユニーク）
    email = Column(String(255), unique=True, index=True, nullable=False)
    # ハッシュ化されたパスワード
    hashed_password = Column(String(255), nullable=False)
    # アカウント作成日時（UTC）
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    # ユーザーロール（admin, user 等）
    role = Column(String(20), default="user", nullable=False)

    # 所属組織のID（SET NULL: 組織が削除されてもユーザーは残る）
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    # リレーションシップ: 所属している組織
    organization = relationship("Organization", back_populates="users")

    # リレーションシップ: 自分が作成したTodoアイテム
    todos = relationship("Todo", back_populates="owner", cascade="all, delete-orphan")
    # リレーションシップ: 自分が作成（オーナー）したプロジェクト
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    # リレーションシップ: 他のプロジェクトへの共同編集者としての参加情報
    collaborations = relationship("ProjectCollaborator", back_populates="user", cascade="all, delete-orphan")
