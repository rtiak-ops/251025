from pydantic import BaseModel, ConfigDict, field_validator, EmailStr
from datetime import datetime
from typing import Optional # 型ヒントとしてOptionalを使用する場合はインポート

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("パスワードは8文字以上である必要があります")
        if len(v.encode("utf-8")) > 72:
            # bcryptは72バイト以降を無視するため、明示的にエラーを返す
            raise ValueError("パスワードは72バイト以下である必要があります (bcryptの制限)")
        return v

class UserOut(UserBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    email: Optional[str] = None

# ----------------------------------------------------------------------
# 1. 基本となるTo Doアイテムのスキーマ (TodoBase)
# ----------------------------------------------------------------------

class TodoBase(BaseModel):
    """
    To Doアイテムが持つ基本的な属性を定義する。
    他の全てのスキーマの基底クラスとなる。
    """
    # To Doのタイトル。必須項目。
    title: str 
    
    # To Doの詳細な説明。任意項目 (Noneを許容) で、デフォルトはNone。
    # Python 3.10以降の記法 'str | None' を使用。
    description: Optional[str] = None
    
    # 完了状態を示すフラグ。任意項目で、デフォルトはFalse（未完了）。
    completed: bool = False

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title cannot be empty")
        if len(v) > 100:
            raise ValueError("Title must be 100 characters or less")
        return v.strip()

# ----------------------------------------------------------------------
# 2. To Doアイテム作成時に入力されるデータ構造 (TodoCreate)
# ----------------------------------------------------------------------

class TodoCreate(TodoBase):
    """
    新しいTo Doアイテムを作成するためのスキーマ。
    TodoBaseをそのまま継承し、title, description, completed (任意) を全て受け付ける。
    - titleはTodoBaseで必須なので、作成時にも必須。
    """
    pass

# ----------------------------------------------------------------------
# 3. To Doアイテム更新時に入力されるデータ構造 (TodoUpdate)
# ----------------------------------------------------------------------

class TodoUpdate(BaseModel): 
    """
    既存のTo Doアイテムを更新するためのスキーマ。
    更新対象のフィールドを全てOptionalにするため、あえてTodoBaseを直接継承しない。
    - 更新では、どれか一つのフィールドだけを変更したい場合があるため。
    """
    # titleを任意 (Optional) に変更。
    title: Optional[str] = None
    
    # descriptionを任意 (Optional) に変更。
    description: Optional[str] = None
    
    # completedを任意 (Optional) に変更。
    completed: Optional[bool] = None

# ----------------------------------------------------------------------
# 4. APIからクライアントへ返却されるTo Doアイテムのデータ構造 (TodoOut)
# ----------------------------------------------------------------------

class TodoOut(TodoBase):
    """
    データベースから取得したTo Doアイテムの情報をクライアントに返すためのスキーマ。
    TodoBaseの属性に加え、DB側で自動生成されるIDを含める。
    """
    # データベース側で自動採番される一意なID。必須項目。
    id: int

    # 作成日時: レコード作成時に現在の日時を自動設定
    created_at: datetime

    # 更新日時: レコード更新時に現在の日時を自動設定
    updated_at: datetime

    owner_id: Optional[int] = None
                
    # Pydantic V2方式: orm_modeの代替としてmodel_configを使用
    # Pydanticモデルが、Pythonのオブジェクト（例: SQLALchemyのモデル）
    # からデータを受け取れるようにする設定。
    # これにより、DBから取得したオブジェクトの属性をモデルにマッピングできる。
    model_config = ConfigDict(from_attributes=True)
    
    # (注意) Pydantic V1の書き方 (非推奨):
    # class Config:
    #     orm_mode = True