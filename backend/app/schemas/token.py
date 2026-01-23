from __future__ import annotations
from pydantic import BaseModel

class Token(BaseModel):
    """
    ユーザーがログインに成功した際に返されるJWTトークンの情報。
    """
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    """
    JWTトークンをデコードした際に取り出されるユーザー情報。
    """
    email: str | None = None
