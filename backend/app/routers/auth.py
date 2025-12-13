from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, schemas
from ..auth import create_access_token
from ..database import get_db
from ..limiter import limiter

# ----------------------------------------------------------------------
# 認証関連のAPIエンドポイントを定義するルーター
# ----------------------------------------------------------------------
# このモジュールは、ユーザー登録（サインアップ）とログイン（サインイン）の機能を提供します。
# FastAPIの APIRouter を使用して、メインのアプリケーションからエンドポイントを分割して管理しています。

# APIRouterインスタンスを作成
# prefix="/auth": このルーター内の全エンドポイントのURLの先頭に /auth が付きます（例: /auth/login）
# tags=["Auth"]: Swagger UIなどのAPIドキュメントで「Auth」グループとして表示され、整理されやすくなります
router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    """
    新規ユーザー登録エンドポイント
    
    メールアドレスとパスワードを受け取り、新しいユーザーアカウントを作成します。
    パスワードはセキュリティのため、ハッシュ化（不可逆暗号化）されてデータベースに保存されます。
    
    Args:
        request: FastAPIのリクエストオブジェクト（Rate LimitでIP制限するために必要）
        user: リクエストボディから受け取るユーザー作成データ（メールアドレス、パスワード）。
              schemas.UserCreate モデルによるバリデーション（形式チェック）を通過したデータです。
        db: データベースセッション。FastAPIの依存性注入（Dependency Injection）により提供されます。
    
    Returns:
        作成されたユーザー情報（schemas.UserOut）。
        セキュリティ上の理由から、レスポンスにはパスワード（ハッシュ値含む）を含めません。
    
    Raises:
        HTTPException: メールアドレスが既に登録されている場合（400 Bad Request）
    """
    # 1. 重複チェック
    # 受け取ったメールアドレスが、既にデータベースに存在するかを確認します。
    # await を使用して、非同期にデータベース検索を行います（I/O待ち時間の効率化）。
    existing = await crud.get_user_by_email(db, email=user.email)
    
    # 既に存在する場合は、重複エラーとして 400 Bad Request を返します。
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="このメールアドレスは既に登録されています",
        )
    
    # 2. ユーザー作成
    # バリデーションと重複チェックをパスした場合のみ、ユーザーを作成します。
    # CRUD操作を行う関数内で、パスワードのハッシュ化などの処理が行われます。
    created = await crud.create_user(db, user=user)
    
    # 3. レスポンス
    # 作成されたユーザー情報を返します（パスワードフィールドは除外されています）。
    return created


@router.post("/login", response_model=schemas.Token)
@limiter.limit("5/minute")
async def login(request: Request, user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    """
    ユーザーログインエンドポイント
    
    メールアドレスとパスワードによる認証を行い、成功した場合に JWT (JSON Web Token) を発行します。
    クライアントはこのトークンを使用することで、以降の認証が必要なリクエストを行うことができます。
    
    Args:
        user: ログイン用のユーザーデータ（schemas.UserCreate を流用）。
        db: データベースセッション。
    
    Returns:
        アクセストークンとトークンタイプを含むオブジェクト。
    
    Raises:
        HTTPException: 認証失敗時（401 Unauthorized）。
    """
    # 1. ユーザー認証処理
    # 入力されたメールアドレスとパスワード（平文）を使って、データベースのユーザーと照合します。
    # authenticate_user 関数内で、入力パスワードをハッシュ化し、DB保存のハッシュ値と比較します。
    db_user = await crud.authenticate_user(db, email=user.email, password=user.password)
    
    # 2. 認証失敗時のハンドリング
    # ユーザーが見つからない、またはパスワードが不一致の場合
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが間違っています",
            # WWW-Authenticateヘッダーは、クライアントにどのような認証が必要か（ここではBearer）を伝えます
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. アクセストークン (JWT) の生成
    # 認証に成功したら、一時的なアクセス許可証であるトークンを作成します。
    # sub (Subject): トークンが誰のものかを示す識別子。ここでは一意なメールアドレスを使用しています。
    # expires_delta: トークンの有効期限。セキュリティのため、必要最小限（例: 60分）に設定します。
    access_token = create_access_token(
        data={"sub": db_user.email},  # トークンに含めるユーザー識別情報
        expires_delta=timedelta(minutes=60),  # トークンの有効期限（60分）
    )
    
    # 4. レスポンス
    # 生成したアクセストークンを返します。
    return schemas.Token(access_token=access_token)
