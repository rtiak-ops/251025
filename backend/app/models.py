from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from datetime import datetime
from .database import Base  # Baseクラスが定義されている場所に応じてインポート
# from your_project_name.database import Base # 例: プロジェクト名を使った絶対インポート推奨

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
        DateTime, 
        default=datetime.now, 
        nullable=False
    )
    
    # 更新日時: レコード更新時に現在の日時を自動設定
    updated_at = Column(
        DateTime, 
        default=datetime.now, 
        onupdate=datetime.now, # レコードが更新されるたびにこの値も更新されます
        nullable=False
    )

    # デバッグやログ出力で役立つ表現メソッド
    def __repr__(self):
        return f"<Todo(id={self.id}, title='{self.title}', completed={self.completed})>"