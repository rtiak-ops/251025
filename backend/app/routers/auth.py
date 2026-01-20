from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
from sqlalchemy.ext.asyncio import AsyncSession
from .. import crud, schemas, auth, models
from ..database import get_db
from ..limiter import limiter

# 認証関連のエンドポイントを定義するルーター
# prefix="/auth" により、全てのパスは /auth/register のようになる
router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute") # 【セキュリティ】大量の偽造アカウント作成を防ぐためのレート制限
async def register(
    request: Request, # slowapi のリミッターがクライアントを識別するために必須
    user: schemas.UserCreate = Body(...), # リクエストボディが JSON 形式であることを明示
    db: AsyncSession = Depends(get_db)
):
    """
    新規ユーザーをデータベースに登録します。
    """
    # 1. 重複チェック：同じメールアドレスのユーザーが既に存在しないか確認
    db_user = await crud.get_user_by_email(db, email=user.email)
    if db_user:
        # 400 Bad Request: クライアント側の入力（メール重複）に問題があるため
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="このメールアドレスは既に登録されています"
        )
    
    # 2. ユーザー作成：パスワードのハッシュ化などは crud 内部で行われる想定
    return await crud.create_user(db=db, user=user)

@router.post("/login", response_model=schemas.Token)
@limiter.limit("10/minute") # 【セキュリティ】パスワード総当たり（ブルートフォース）攻撃を抑制
async def login(
    request: Request,
    # UserLogin スキーマがないため暫定的に UserCreate を流用。
    # Body(...) を使うことで、クエリパラメータではなく JSON ボディからの読み取りを強制。
    login_data: schemas.UserCreate = Body(...), 
    db: AsyncSession = Depends(get_db)
):
    """
    ユーザー認証を行い、有効な JWT アクセストークンを発行します。
    """
    # 1. 認証：メールアドレスとパスワードの組み合わせを検証
    user = await crud.authenticate_user(
        db, email=login_data.email, password=login_data.password
    )
    
    # 2. 認証失敗時の処理：セキュリティ上、メールとパスワードのどちらが間違っているかは明かさない
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが正しくありません",
            headers={"WWW-Authenticate": "Bearer"}, # 認証が必要であることを示す標準ヘッダー
        )
    
    # 3. トークン生成：認証成功後、ユーザーの識別子（email等）を含めた JWT を作成
    access_token = auth.create_access_token(data={"sub": user.email})
    
    # 4. レスポンス：OAuth2 準拠の形式でトークンを返却
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users", response_model=list[schemas.UserOut])
async def search_users(
    email: str,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    メンバー追加のためにユーザーをメールアドレスで検索します。
    【セキュリティ改善】
    1. 3文字未満の検索を禁止（無差別な探索を防ぐ）
    2. 検索対象を「組織未所属のユーザー」または「自分の組織のユーザー」に限定
    """
    from sqlalchemy import select, or_
    from ..models import User
    
    # 短すぎる検索クエリを拒否
    if len(email) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="検索キーワードは3文字以上で入力してください"
        )
    
    # 検索条件の構築
    # - メールアドレスが部分一致
    # - かつ、(自分の所属組織と同じ OR 組織に未所属)
    stmt = select(User).where(User.email.ilike(f"%{email}%"))
    
    if current_user.organization_id:
        stmt = stmt.where(
            or_(
                User.organization_id == current_user.organization_id,
                User.organization_id == None
            )
        )
    else:
        # 自分が無所属の場合は、無所属のユーザーのみ検索可能
        stmt = stmt.where(User.organization_id == None)

    stmt = stmt.limit(5)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/me", response_model=schemas.UserOut)
async def read_users_me(current_user: schemas.UserOut = Depends(auth.get_current_user)):
    """
    ログイン中の自分の情報を取得します。
    """
    return current_user