from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

class UserBase(BaseModel):
    """
    ユーザーが持つ基本的な属性を定義する。
    他のユーザー関連スキーマの基底クラスとなる。
    """
    email: EmailStr

class UserCreate(UserBase):
    """
    新しいユーザーを作成（登録）するためのスキーマ。
    UserBaseを継承し、emailに加えてpasswordも受け付ける。
    """
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """
        パスワードが安全な条件を満たしているかチェックする。
        - 8文字以上であること（セキュリティ上の最低要件）
        - 72バイト以下であること（bcryptハッシュ化の制限）
        """
        if len(v) < 8:
            raise ValueError("パスワードは8文字以上である必要があります")
        
        if len(v.encode("utf-8")) > 72:
            raise ValueError("パスワードは72バイト以下である必要があります (bcryptの制限)")
        
        return v

class UserOut(UserBase):
    """
    データベースから取得したユーザー情報をクライアントに返すためのスキーマ。
    UserBaseの属性（email）に加え、DB側で自動生成されるIDと作成日時を含める。
    """
    id: int
    created_at: datetime
    role: str
    organization_id: int | None = None

    model_config = ConfigDict(from_attributes=True)

class UserRoleUpdate(BaseModel):
    """
    ユーザーの役割を更新するためのスキーマ。
    """
    role: str # 例: "admin", "user"

class UserOrganizationUpdate(BaseModel):
    """
    ユーザーを組織に追加するためのスキーマ。
    """
    email: EmailStr
