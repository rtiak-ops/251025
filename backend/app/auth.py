from datetime import datetime, timedelta, timezone
import os
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from . import crud, schemas
from .database import get_db

# ----------------------------------------------------------------------
# JWT (JSON Web Token) 認証の設定
# ----------------------------------------------------------------------

# JWTトークンを署名するための秘密鍵（環境変数から取得、デフォルトは"CHANGE_ME"）
# 本番環境では必ず環境変数で設定すること（例: SECRET_KEY=your-very-secure-random-string）
SECRET_KEY = os.getenv("SECRET_KEY", "CHANGE_ME")

# JWTの署名アルゴリズム（HS256 = HMAC-SHA256）
ALGORITHM = "HS256"

# アクセストークンの有効期限（分単位、環境変数から取得、デフォルトは60分）
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# OAuth2パスワード認証のスキーム（Bearerトークン方式）
# tokenUrl: トークンを取得するエンドポイントのURL
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    JWT（JSON Web Token）アクセストークンを生成する関数
    
    Args:
        data: トークンに含めるデータ（通常は {"sub": "user@example.com"} のようなユーザー識別情報）
        expires_delta: トークンの有効期限（省略時はデフォルト値を使用）
    
    Returns:
        署名済みのJWT文字列
    """
    # 元のデータをコピー（元の辞書を変更しないようにする）
    to_encode = data.copy()
    
    # トークンの有効期限を計算
    # expires_deltaが指定されていればそれを使用、なければデフォルト値（ACCESS_TOKEN_EXPIRE_MINUTES分）
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    
    # トークンに有効期限（"exp" クレーム）を追加
    to_encode.update({"exp": expire})
    
    # SECRET_KEYで署名してJWT文字列を生成
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def _decode_token(token: str) -> str:
    """
    JWTトークンを検証して、中に含まれるユーザーのメールアドレス（sub）を取得する内部関数
    
    Args:
        token: 検証するJWTトークン文字列
    
    Returns:
        トークンに含まれるメールアドレス（subクレームの値）
    
    Raises:
        JWTError: トークンが無効、期限切れ、または署名が正しくない場合
    """
    try:
        # トークンをデコードして検証（署名の確認と有効期限のチェックも行う）
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # ペイロードからユーザー識別子（sub = subject）を取得
        email: str | None = payload.get("sub")
        
        # subが存在しない場合はエラー
        if email is None:
            raise JWTError("Missing subject")
        
        return email
    except JWTError as exc:
        # JWTエラー（無効なトークン、期限切れなど）をそのまま再発生させる
        # 呼び出し側で統一的にエラーハンドリングできるようにする
        raise exc


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> schemas.UserOut:
    """
    リクエストに含まれるJWTトークンから現在ログインしているユーザーを取得する依存関数
    
    FastAPIのDepends()で使用され、エンドポイントで認証が必要な場合に自動的に呼び出されます。
    リクエストヘッダーの "Authorization: Bearer <token>" からトークンを取得します。
    
    Args:
        token: OAuth2スキームから自動的に取得されるJWTトークン（oauth2_scheme依存関数経由）
        db: データベースセッション（get_db依存関数経由）
    
    Returns:
        認証されたユーザーの情報（schemas.UserOut）
    
    Raises:
        HTTPException: トークンが無効、またはユーザーが見つからない場合（401 Unauthorized）
    """
    # 認証に失敗した場合に返す共通のエラーレスポンス
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,  # 401 Unauthorized
        detail="認証情報を検証できませんでした",  # 認証情報が無効であることを示すメッセージ
        headers={"WWW-Authenticate": "Bearer"},  # クライアントにBearer認証が必要であることを通知
    )
    
    try:
        # JWTトークンを検証して、中に含まれるメールアドレスを取得
        email = _decode_token(token)
        # TokenDataスキーマにメールアドレスを格納
        token_data = schemas.TokenData(email=email)
    except JWTError:
        # トークンが無効、期限切れ、または署名が正しくない場合は認証エラー
        raise credentials_exception

    # トークンから取得したメールアドレスでデータベースからユーザーを検索
    user = await crud.get_user_by_email(db, email=token_data.email) if token_data.email else None
    
    # ユーザーが見つからない場合も認証エラー
    if user is None:
        raise credentials_exception
    
    # データベースのモデル（models.User）をAPIレスポンス用のスキーマ（schemas.UserOut）に変換して返す
    return schemas.UserOut.model_validate(user)
