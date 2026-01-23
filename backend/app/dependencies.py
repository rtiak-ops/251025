from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from .core import config, security
from .core.security import decode_token
from .database import get_db
from . import crud, models, schemas

# OAuth2パスワード認証のスキーム
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> models.User:
    """リクエストに含まれるトークンから現在ログイン中のユーザーを取得"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="認証情報を検証できませんでした",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # トークンをデコード
        payload = decode_token(token)
        email: str | None = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # データベースからユーザーを検索
    user = await crud.get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    
    return user

def require_role(allowed_roles: list[str]):
    """特定のロールを持つユーザーのみを許可する依存関数"""
    async def role_checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"この操作には {', '.join(allowed_roles)} の権限が必要です"
            )
        return current_user
    return role_checker

# ショートカット
admin_required = require_role(["admin"])
