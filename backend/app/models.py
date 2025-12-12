from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
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
    
    # リレーションシップ: このユーザーが所有するTodoアイテムへの参照
    # back_populates: Todoモデルの"owner"属性と双方向にリンク
    # cascade="all, delete-orphan": ユーザーが削除された場合、関連するTodoも自動的に削除される
    todos = relationship("Todo", back_populates="owner", cascade="all, delete-orphan")

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

    # 外部キー: このTodoを所有するユーザーのID（usersテーブルのidを参照）
    # nullable=True: 現在は任意だが、認証機能を追加する場合は必須（nullable=False）に変更することを推奨
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    # リレーションシップ: このTodoを所有するユーザーへの参照
    # back_populates: Userモデルの"todos"属性と双方向にリンク
    owner = relationship("User", back_populates="todos")

    # デバッグやログ出力で役立つ表現メソッド
    def __repr__(self):
        return f"<Todo(id={self.id}, title='{self.title}', completed={self.completed})>"