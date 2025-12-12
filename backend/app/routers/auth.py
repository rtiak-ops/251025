from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, schemas
from ..auth import create_access_token
from ..database import get_db

# ----------------------------------------------------------------------
# 認証関連のAPIエンドポイントを定義するルーター
# ----------------------------------------------------------------------

# APIRouterインスタンスを作成
# prefix="/auth": 全てのエンドポイントが /auth から始まる
# tags=["Auth"]: Swagger UI/ReDocのAPIドキュメントで「Auth」グループに分類される
router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
async def register(user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    """
    新規ユーザー登録エンドポイント
    
    メールアドレスとパスワードを受け取り、新しいユーザーアカウントを作成します。
    パスワードは自動的にハッシュ化されてデータベースに保存されます。
    
    Args:
        user: ユーザー作成用のデータ（メールアドレスとパスワード）
        db: データベースセッション（依存性注入）
    
    Returns:
        作成されたユーザー情報（パスワードは含まれません）
    
    Raises:
        HTTPException: メールアドレスが既に登録されている場合（400 Bad Request）
    """
    # 既に同じメールアドレスで登録されているかチェック
    existing = await crud.get_user_by_email(db, email=user.email)
    
    # 既に存在する場合はエラーを返す
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,  # 400 Bad Request
            detail="Email already registered",  # エラーメッセージ
        )
    
    # 新規ユーザーを作成（パスワードは自動的にハッシュ化される）
    created = await crud.create_user(db, user=user)
    
    # 作成されたユーザー情報を返す（パスワードは含まれない）
    return created


@router.post("/login", response_model=schemas.Token)
async def login(user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    """
    ユーザーログインエンドポイント
    
    メールアドレスとパスワードを受け取り、認証が成功したらJWTアクセストークンを発行します。
    このトークンは以降のAPIリクエストで認証に使用されます。
    
    Args:
        user: ログイン情報（メールアドレスとパスワード）
        db: データベースセッション（依存性注入）
    
    Returns:
        アクセストークンを含むレスポンス（{"access_token": "...", "token_type": "bearer"}）
    
    Raises:
        HTTPException: メールアドレスまたはパスワードが正しくない場合（401 Unauthorized）
    """
    # メールアドレスとパスワードでユーザーを認証
    # authenticate_user関数内でパスワードのハッシュ比較が行われる
    db_user = await crud.authenticate_user(db, email=user.email, password=user.password)
    
    # 認証に失敗した場合（ユーザーが存在しない、またはパスワードが間違っている）
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,  # 401 Unauthorized
            detail="Incorrect email or password",  # エラーメッセージ（セキュリティ上、具体的な理由は示さない）
            headers={"WWW-Authenticate": "Bearer"},  # Bearer認証が必要であることを示す
        )
    
    # 認証成功: JWTアクセストークンを生成
    # "sub"（subject）クレームにユーザーのメールアドレスを設定
    # 有効期限は60分
    access_token = create_access_token(
        data={"sub": db_user.email},  # トークンに含めるユーザー識別情報
        expires_delta=timedelta(minutes=60),  # トークンの有効期限（60分）
    )
    
    # トークンをレスポンスとして返す
    return schemas.Token(access_token=access_token)
