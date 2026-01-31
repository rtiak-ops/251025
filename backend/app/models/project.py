from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from ..database import Base


class Project(Base):
    """
    プロジェクト情報を管理するデータベースモデルです。
    タスク（Todo）をグループ化し、所有者や組織、共同編集者を管理します。
    """
    __tablename__ = "projects"

    # プライマリキー
    id = Column(Integer, primary_key=True, index=True)
    # プロジェクト名
    name = Column(String(100), nullable=False)
    # プロジェクトの説明（詳細）
    description = Column(Text, nullable=True)
    # 作成日時（UTC）
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    # 更新日時（自動更新、UTC）
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC), nullable=False)
    
    # プロジェクト作成者（オーナー）のユーザーID
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # 関連付けられた組織のID（CASCADE: 組織削除でプロジェクトも削除）
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # リレーションシップ: 関連組織
    organization = relationship("Organization", back_populates="projects")
    # リレーションシップ: プロジェクトオーナー
    owner = relationship("User", back_populates="projects")
    # リレーションシップ: このプロジェクトに紐づく全てのTodo（プロジェクト削除でTodoも削除）
    todos = relationship("Todo", back_populates="project", cascade="all, delete-orphan")
    # リレーションシップ: このプロジェクトの共同編集者リスト
    collaborators = relationship("ProjectCollaborator", back_populates="project", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Project(id={self.id}, name='{self.name}')>"

class ProjectCollaborator(Base):
    """
    プロジェクトの共同作業者（コラボレーター）とその権限を管理する中間テーブルモデルです。
    """
    __tablename__ = "project_collaborators"

    # プライマリキー
    id = Column(Integer, primary_key=True, index=True)
    # 対象プロジェクトのID
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    # 招待された共同作業者のユーザーID
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # 権限レベル（viewer, editor 等、デフォルトは editor）
    permission = Column(String(20), default="editor", nullable=False)

    # リレーションシップ: 共同作業の対象となるプロジェクト
    project = relationship("Project", back_populates="collaborators")
    # リレーションシップ: 共同作業者となるユーザー
    user = relationship("User", back_populates="collaborations")
