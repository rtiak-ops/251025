from __future__ import annotations
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from ..database import Base

class Todo(Base):
    """
    Todoタスクモデル
    """
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    completed = Column(Boolean, default=False)
    order = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    status = Column(String(20), default="TODO", nullable=False)
    priority = Column(String(20), default="MEDIUM", nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)

    owner = relationship("User", back_populates="todos")
    project = relationship("Project", back_populates="todos")

    def __repr__(self):
        return f"<Todo(id={self.id}, title='{self.title}', completed={self.completed})>"
