from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from ..database import Base


class Organization(Base):
    """
    組織（テナント）情報を管理するデータベースモデルです。
    マルチテナント構造の基盤となり、ユーザーやプロジェクトをグループ化します。
    """
    __tablename__ = "organizations"

    # プライマリキー
    id = Column(Integer, primary_key=True, index=True)
    # 組織名（ユニーク）
    name = Column(String(255), unique=True, nullable=False, index=True)
    # 法人番号（オプション、13桁）
    corporate_id = Column(String(13), unique=True, nullable=True, index=True)
    # ウェブサイトURL
    website = Column(String(255), nullable=True)
    # 認証済みフラグ
    is_verified = Column(Boolean, default=False, nullable=False)
    # 利用プラン（free, pro, enterprise 等）
    plan = Column(String(50), default="free", nullable=False)
    # 作成日時（UTC）
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)

    # リレーションシップ: この組織に所属するユーザー
    users = relationship("User", back_populates="organization")
    # リレーションシップ: この組織に関連付けられたプロジェクト
    # 組織が削除された場合、関連するプロジェクトも削除される（delete-orphan）
    projects = relationship("Project", back_populates="organization", cascade="all, delete-orphan")
