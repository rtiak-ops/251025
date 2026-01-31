from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from .core.security import decode_token
from .database import get_db
from . import crud, models

# 認証トークンの受け渡しにOAuth2の Bearer形式（Authorization: Bearer <TOKEN>）を使用することを定義
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> models.User:
    """
    リクエストヘッダーに含まれるJWTトークンを検証し、現在ログイン中のユーザー情報を取得します。
    認証に失敗した場合は 401 Unauthorized エラーを発生させます。
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="認証情報を検証できませんでした",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # トークンの署名を検証しデコード
        payload = decode_token(token)
        # トークン内の 'sub' クレーム（通常はユーザーの識別子、ここではemail）を取得
        email: str | None = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        # トークンの期限切れや改ざん等
        raise credentials_exception

    # デコードされたemailを元にデータベースからユーザー実体を取得
    user = await crud.get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    
    return user

def require_role(allowed_roles: list[str]):
    """
    特定のユーザー権限（admin等）が要求されるエンドポイント向けの権限チェッカー。
    
    使用例: admin_required = require_role(["admin"])
    """
    async def role_checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"この操作には {', '.join(allowed_roles)} の権限が必要です"
            )
        return current_user
    return role_checker

# 管理者権限を要求する際のショートカット
admin_required = require_role(["admin"])
