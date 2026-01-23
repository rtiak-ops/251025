from __future__ import annotations
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from ..database import Base

class Project(Base):
    """
    プロジェクトモデル
    """
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    
    organization = relationship("Organization", back_populates="projects")
    owner = relationship("User", back_populates="projects")
    todos = relationship("Todo", back_populates="project", cascade="all, delete-orphan")
    collaborators = relationship("ProjectCollaborator", back_populates="project", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Project(id={self.id}, name='{self.name}')>"

class ProjectCollaborator(Base):
    """
    プロジェクト共同作業者モデル
    """
    __tablename__ = "project_collaborators"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    permission = Column(String(20), default="editor", nullable=False)

    project = relationship("Project", back_populates="collaborators")
    user = relationship("User", back_populates="collaborations")
