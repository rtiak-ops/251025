from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from ..database import Base


class Todo(Base):
    """
    タスク（Todo）情報を管理するデータベースモデルです。
    タスクのタイトル、内容、完了状態、優先度、期限、および所属プロジェクトや所有者を管理します。
    """
    __tablename__ = "todos"

    # プライマリキー
    id = Column(Integer, primary_key=True, index=True)
    # タスクのタイトル
    title = Column(String(100), nullable=False)
    # タスクの詳細説明
    description = Column(Text, nullable=True)
    # 完了状態フラグ
    completed = Column(Boolean, default=False)
    # 表示順序（並び替え用）
    order = Column(Integer, default=0, nullable=False)
    
    # 作成日時（UTC）
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    # 更新日時（自動更新、UTC）
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC), nullable=False)

    # 所属プロジェクトのID
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    # タスク作成者（オーナー）のユーザーID
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # 進捗ステータス（TODO, IN_PROGRESS, DONE 等）
    status = Column(String(20), default="TODO", nullable=False)
    # 優先度（LOW, MEDIUM, HIGH 等）
    priority = Column(String(20), default="MEDIUM", nullable=False)
    # 完了期限（UTC）
    due_date = Column(DateTime(timezone=True), nullable=True)

    # リレーションシップ: タスクオーナー
    owner = relationship("User", back_populates="todos")
    # リレーションシップ: 所属プロジェクト
    project = relationship("Project", back_populates="todos")

    def __repr__(self):
        return f"<Todo(id={self.id}, title='{self.title}', completed={self.completed})>"
