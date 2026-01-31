from datetime import UTC, datetime, timedelta

from jose import jwt
from passlib.context import CryptContext

from .config import ALGORITHM, SECRET_KEY

# パスワードハッシュ化の設定
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """JWTアクセストークンを生成"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        # デフォルトは60分などはconfigから取れるが、引数で渡すかconfigを直参照するか
        from .config import ACCESS_TOKEN_EXPIRE_MINUTES
        expire = datetime.now(UTC) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """パスワードの検証"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """パスワードのハッシュ化"""
    return pwd_context.hash(password)

def decode_token(token: str) -> dict:
    """トークンのデコードと検証"""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
