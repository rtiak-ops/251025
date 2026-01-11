from __future__ import annotations  # Python 3.10+: 型ヒントの前方参照を簡潔に

from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base  # Baseクラスが定義されている場所に応じてインポート
# from your_project_name.database import Base # 例: プロジェクト名を使った絶対インポート推奨

class User(Base):
    """
    ユーザーモデル（データベーステーブル: users）
    
    アプリケーションに登録されているユーザーの情報を格納します。
    """
    __tablename__ = "users"

    # 主キー: ユーザーを一意に識別するID（自動採番）
    id = Column(Integer, primary_key=True, index=True)
    
    # メールアドレス: 一意制約付き（同じメールアドレスは登録不可）、インデックスあり、必須
    email = Column(String(255), unique=True, index=True, nullable=False)
    
    # ハッシュ化されたパスワード: bcryptなどのアルゴリズムでハッシュ化されたパスワードを保存、必須
    # 注意: 平文のパスワードは保存しない
    hashed_password = Column(String(255), nullable=False)
    
    # アカウント作成日時: ユーザーが登録された日時を自動記録
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # 役割: 'admin' か 'user' (将来的に拡張可能)
    role = Column(String(20), default="user", nullable=False)

    # リレーションシップ: このユーザーが所有するTodoアイテムへの参照
    # back_populates: Todoモデルの"owner"属性と双方向にリンク
    # cascade="all, delete-orphan": ユーザーが削除された場合、関連するTodoも自動的に削除される
    todos = relationship("Todo", back_populates="owner", cascade="all, delete-orphan")
    
    # リレーションシップ: このユーザーが所有するプロジェクトへの参照
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")

    # リレーションシップ: このユーザーが関係しているプロジェクト（コラボレーターとして）
    collaborations = relationship("ProjectCollaborator", back_populates="user", cascade="all, delete-orphan")

class Project(Base):
    """
    プロジェクトモデル（データベーステーブル: projects）
    
    タスクをグループ化するためのプロジェクト。
    """
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    # 外部キー: このプロジェクトを所有するユーザーのID
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # リレーションシップ
    owner = relationship("User", back_populates="projects")
    todos = relationship("Todo", back_populates="project", cascade="all, delete-orphan")
    
    # リレーションシップ: このプロジェクトに参加している協力者
    collaborators = relationship("ProjectCollaborator", back_populates="project", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Project(id={self.id}, name='{self.name}')>"

class Todo(Base):
    # テーブル名: 一般的に複数形を使用します
    __tablename__ = "todos"

    # 主キー (Primary Key): レコードを一意に識別するためのID
    id = Column(
        Integer, 
        primary_key=True, # 主キーとして設定
        index=True        # 検索速度向上のためにインデックスを作成
    )
    
    # タイトル: 必須項目 (nullable=False)、長さは100文字に制限
    title = Column(
        String(100), 
        nullable=False
    )
    
    # 説明: 長い文章を格納できるようText型を使用 (制限なし)。任意項目 (nullable=True)
    description = Column(
        Text, 
        nullable=True
    )
    
    # 完了フラグ: Boolean型。デフォルト値はFalse (未完了)
    completed = Column(
        Boolean, 
        default=False
    )

    # 表示順序: 並び替え用 (小さい数値が上)
    order = Column(Integer, default=0, nullable=False)
    
    # 作成日時: レコード作成時に現在の日時を自動設定
    created_at = Column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc), 
        nullable=False
    )
    
    # 更新日時: レコード更新時に現在の日時を自動設定
    updated_at = Column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc), # レコードが更新されるたびにこの値も更新されます
        nullable=False
    )

    # 外部キー: このTodoを所有するプロジェクトのID (任意)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)

    # 外部キー: このTodoを所有するユーザーのID
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # ステータス: 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE' など
    status = Column(String(20), default="TODO", nullable=False)
    
    # 優先度: 'LOW', 'MEDIUM', 'HIGH', 'URGENT' など
    priority = Column(String(20), default="MEDIUM", nullable=False)
    
    # 期限日
    due_date = Column(DateTime(timezone=True), nullable=True)

    # リレーションシップ: このTodoを所有するユーザーへの参照
    # back_populates: Userモデルの"todos"属性と双方向にリンク
    owner = relationship("User", back_populates="todos")

    # リレーションシップ: このTodoが属するプロジェクトへの参照
    project = relationship("Project", back_populates="todos")

    # デバッグやログ出力で役立つ表現メソッド
    def __repr__(self):
        return f"<Todo(id={self.id}, title='{self.title}', completed={self.completed})>"