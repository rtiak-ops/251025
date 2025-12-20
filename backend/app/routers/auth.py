from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from .. import crud, schemas, auth
from ..database import get_db

from ..limiter import limiter
from fastapi import Request

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute") # 新規登録は制限を厳しく
async def register(
    request: Request, # limiter用に必要
    user: schemas.UserCreate = Body(...),
    db: AsyncSession = Depends(get_db)
):
    db_user = await crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています")
    return await crud.create_user(db=db, user=user)

@router.post("/login", response_model=schemas.Token)
@limiter.limit("10/minute") # ブルートフォース攻撃対策
async def login(
    request: Request, # limiter用に必要
    # UserLogin がないので UserCreate を使用。Body(...) でJSON入力を強制。
    login_data: schemas.UserCreate = Body(...), 
    db: AsyncSession = Depends(get_db)
):
    # crud側の関数名や引数名は、プロジェクトの実装に合わせて調整してください
    user = await crud.authenticate_user(
        db, email=login_data.email, password=login_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが正しくありません",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}