from __future__ import annotations
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from ..database import Base

class Organization(Base):
    """
    組織（テナント）モデル
    """
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    corporate_id = Column(String(13), unique=True, nullable=True, index=True)
    website = Column(String(255), nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    plan = Column(String(50), default="free", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    users = relationship("User", back_populates="organization")
    projects = relationship("Project", back_populates="organization", cascade="all, delete-orphan")
