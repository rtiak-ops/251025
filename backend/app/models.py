# ======================================================================
# データベースモデル定義ファイル (SQLAlchemy Models)
# ======================================================================
# このファイルでは、データベースのテーブル構造（スキーマ）を定義します。
# 各クラスが1つのテーブルに対応し、属性がカラムに対応します。

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base

class Organization(Base):
    """
    組織（テナント）モデル
    B2B利用における会社やチーム、部署などの単位を管理します。
    """
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True) # 組織固有のID
    name = Column(String(255), unique=True, nullable=False, index=True) # 組織名
    corporate_id = Column(String(13), unique=True, nullable=True, index=True) # 日本の法人番号（13桁）
    website = Column(String(255), nullable=True) # 公式ウェブサイトURL
    is_verified = Column(Boolean, default=False, nullable=False) # 認証済み組織フラグ
    plan = Column(String(50), default="free", nullable=False) # 利用プラン ('free', 'pro', 'enterprise')
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False) # 登録日時

    # --- リレーションシップ ---
    # 組織に所属するユーザーのリスト
    users = relationship("User", back_populates="organization")
    # 組織に紐づくプロジェクトのリスト。組織削除時は関連プロジェクトも削除される。
    projects = relationship("Project", back_populates="organization", cascade="all, delete-orphan")

class User(Base):
    """
    ユーザーモデル（データベーステーブル: users）
    システムの利用者を管理します。
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True) # ユーザーID
    email = Column(String(255), unique=True, index=True, nullable=False) # ログイン用のメールアドレス
    hashed_password = Column(String(255), nullable=False) # ハッシュ化されたパスワード
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False) # アカウント作成日時
    role = Column(String(20), default="user", nullable=False) # システム上の役割 ('admin' or 'user')

    # 所属組織への外部キー参照
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    organization = relationship("Organization", back_populates="users")

    # --- リレーションシップ ---
    # このユーザーが作成したTodoリスト。ユーザー削除時に連動して削除。
    todos = relationship("Todo", back_populates="owner", cascade="all, delete-orphan")
    # このユーザーがオーナーとして管理しているプロジェクト。
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    # このユーザーが参加パス（共同作業者）として紐付いている情報。
    collaborations = relationship("ProjectCollaborator", back_populates="user", cascade="all, delete-orphan")

class Project(Base):
    """
    プロジェクトモデル（データベーステーブル: projects）
    複数のTodoタスクを束ねるプロジェクト単位を管理します。
    """
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True) # プロジェクトID
    name = Column(String(100), nullable=False) # プロジェクト名
    description = Column(Text, nullable=True) # プロジェクトの詳細解説
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False) # 作成日時
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False) # 更新日時
    
    # プロジェクトオーナー（作成者）のID
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # 所属組織への参照。組織が削除されたらプロジェクトも削除（CASCADE）。
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    organization = relationship("Organization", back_populates="projects")

    # --- リレーションシップ ---
    # オーナーユーザーへの参照
    owner = relationship("User", back_populates="projects")
    # プロジェクトに含まれるTodoタスクのリスト
    todos = relationship("Todo", back_populates="project", cascade="all, delete-orphan")
    # プロジェクトに参加している共同作業者のリスト
    collaborators = relationship("ProjectCollaborator", back_populates="project", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Project(id={self.id}, name='{self.name}')>"

class Todo(Base):
    """
    Todoタスクモデル（データベーステーブル: todos）
    個々の具体的なタスク（やること）を管理します。
    """
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, index=True) # タスクID
    title = Column(String(100), nullable=False) # タスク名
    description = Column(Text, nullable=True) # タスクの詳細
    completed = Column(Boolean, default=False) # 完了フラグ (True: 完了, False: 未完了)
    order = Column(Integer, default=0, nullable=False) # 表示順序の管理用
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False) # 作成日時
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False) # 最終更新日時

    # 外部キー参照
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True) # 所属プロジェクト（任意）
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True) # 作成者

    # ステータス・優先度管理
    status = Column(String(20), default="TODO", nullable=False) # ステータス (TODO, IN_PROGRESS等)
    priority = Column(String(20), default="MEDIUM", nullable=False) # 優先度 (LOW, MEDIUM, HIGH, URGENT)
    due_date = Column(DateTime(timezone=True), nullable=True) # 期限日

    # --- リレーションシップ ---
    owner = relationship("User", back_populates="todos")
    project = relationship("Project", back_populates="todos")

    def __repr__(self):
        return f"<Todo(id={self.id}, title='{self.title}', completed={self.completed})>"

class ProjectCollaborator(Base):
    """
    プロジェクト共同作業者モデル（データベーステーブル: project_collaborators）
    プロジェクトに対する他ユーザーの参加権限を管理する中間テーブルです。
    """
    __tablename__ = "project_collaborators"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True) # 対象プロジェクト
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True) # 対象ユーザー
    permission = Column(String(20), default="editor", nullable=False) # 権限レベル ('viewer' or 'editor')

    # --- リレーションシップ ---
    project = relationship("Project", back_populates="collaborators")
    user = relationship("User", back_populates="collaborations")

class AuditLog(Base):
    """
    監査ログモデル（データベーステーブル: audit_logs）
    システム内での重要な操作（作成、変更、削除など）を追跡・記録します。
    """
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True) # 操作を実行したユーザー
    action = Column(String(50), nullable=False) # 実行されたアクション名 (例: "CREATE", "UPDATE")
    resource_type = Column(String(50), nullable=False) # 対象リソースの種類 (例: "todo", "project")
    resource_id = Column(Integer, nullable=True) # 対象リソースのID
    details = Column(Text, nullable=True) # 操作に関する詳細な情報
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False) # ログ記録日時
    
    # 所属組織への参照。組織が削除されてもログは保全（SET NULL）。
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)

    # --- リレーションシップ ---
    user = relationship("User")
