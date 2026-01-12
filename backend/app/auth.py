from __future__ import annotations  # Python 3.10+: 型ヒントの前方参照を簡潔に

import os
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from . import crud, schemas, models
from .database import get_db

# ----------------------------------------------------------------------
# JWT (JSON Web Token) 認証の設定
# ----------------------------------------------------------------------
# 
# 【JWTとは？】
# JWT (JSON Web Token) は、ユーザー認証のための「デジタル身分証明書」のようなものです。
# ログイン成功時にサーバーが発行し、クライアントが保存して、以降のリクエストで提示します。
# 
# 【JWTの3つの構造】
# JWTは「ヘッダー.ペイロード.署名」の3部分で構成されています:
# 
# 1. ヘッダー (Header)
#    - トークンの種類（JWT）と署名アルゴリズム（HS256など）を記載
#    - 例: {"alg": "HS256", "typ": "JWT"}
# 
# 2. ペイロード (Payload)
#    - 実際のデータ（クレーム）を格納する部分
#    - 例: {"sub": "user@example.com", "exp": 1234567890}
#    - 主なクレーム:
#      * sub (Subject): ユーザー識別子（このアプリではメールアドレス）
#      * exp (Expiration): トークンの有効期限（UNIXタイムスタンプ）
#      * iat (Issued At): トークンの発行日時
# 
# 3. 署名 (Signature)
#    - ヘッダーとペイロードを秘密鍵で署名したもの
#    - トークンが改ざんされていないことを保証します
#    - 計算式: HMACSHA256(base64(header) + "." + base64(payload), SECRET_KEY)
# 
# 【JWTの動作フロー】
# 
# ステップ1: ログイン
#   クライアント → サーバー: メールアドレス + パスワード
#   サーバー: 認証成功 → JWTトークンを生成して返す
# 
# ステップ2: トークンの保存
#   クライアント: 受け取ったトークンをlocalStorageなどに保存
# 
# ステップ3: 認証が必要なリクエスト
#   クライアント → サーバー: リクエストヘッダーに "Authorization: Bearer <token>" を付与
#   サーバー: トークンを検証（署名チェック + 有効期限チェック）
#   サーバー: 検証成功 → ペイロードからユーザー情報を取得 → リクエスト処理
# 
# 【JWTのメリット】
# ✓ ステートレス: サーバー側でセッション情報を保持する必要がない
# ✓ スケーラブル: 複数サーバー間で認証情報を共有しやすい
# ✓ 自己完結型: トークン自体にユーザー情報が含まれている
# 
# 【セキュリティ上の注意点】
# ⚠ SECRET_KEYは絶対に秘密にする（漏洩すると偽造トークンを作られる）
# ⚠ トークンの有効期限は短めに設定する（盗まれた場合のリスク軽減）
# ⚠ HTTPS通信を使用する（トークンの盗聴を防ぐ）
# ⚠ ペイロードには機密情報を入れない（Base64エンコードは暗号化ではない）
# ----------------------------------------------------------------------

# JWTトークンを署名するための秘密鍵（環境変数から取得）
# 重要: 本番環境では必ず環境変数 'SECRET_KEY' を設定してください。
# 強力な鍵の生成例: `openssl rand -hex 32`
SECRET_KEY = os.getenv("SECRET_KEY", "CHANGE_ME")

# 本番環境（ENV=production）でデフォルト値が使用されている場合はエラーを出す
ENV = os.getenv("ENV", "development")
if ENV == "production":
    if SECRET_KEY == "CHANGE_ME" or len(SECRET_KEY) < 32:
        raise ValueError(
            "本番環境では安全なSECRET_KEYが必須です。\n"
            "以下のコマンドで生成してください: openssl rand -hex 32\n"
            "生成した値を環境変数 SECRET_KEY に設定してください。"
        )
    import logging
    logging.info("SECRET_KEY検証: 本番環境用の安全な鍵が設定されています。")
elif SECRET_KEY == "CHANGE_ME":
    import logging
    logging.warning(
        "開発環境でデフォルトのSECRET_KEYを使用しています。"
        "本番環境では必ず変更してください。"
    )

# JWTの署名アルゴリズム（HS256 = HMAC-SHA256）
ALGORITHM = "HS256"

# アクセストークンの有効期限（分単位、環境変数から取得、デフォルトは60分）
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# OAuth2パスワード認証のスキーム（Bearerトークン方式）
# tokenUrl: トークンを取得するエンドポイントのURL
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
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

def require_role(allowed_roles: list[str]):
    """
    特定のロールを持つユーザーのみを許可する依存関数を作成します。
    """
    async def role_checker(current_user: schemas.UserOut = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"この操作には {', '.join(allowed_roles)} の権限が必要です"
            )
        return current_user
    return role_checker

# 管理者のみ許可するためのショートカット
admin_required = require_role(["admin"])
