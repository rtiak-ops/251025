from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, dependencies, models, schemas
from ..database import get_db
from ..limiter import limiter

router = APIRouter(prefix="/admin/users", tags=["Admin Users"])

@router.get("", response_model=list[schemas.UserOut])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(dependencies.admin_required),
):
    """
    所属組織に属しているユーザーのリストを取得します。管理者権限が必要です。
    """
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="組織に所属していないため、ユーザー管理機能を使用できません。先に組織を作成してください。"
        )
    
    return await crud.get_organization_users(
        db, 
        organization_id=current_user.organization_id, 
        skip=skip, 
        limit=limit
    )

@router.patch("/{user_id}/role", response_model=schemas.UserOut)
async def update_user_role(
    user_id: int,
    role_data: schemas.UserRoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(dependencies.admin_required),
):
    """
    指定したユーザーの権限（ロール）を変更します。
    """
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="組織に所属していないため、ユーザー管理機能を使用できません。"
        )
    
    db_user = await crud.update_user_role(
        db, 
        user_id=user_id, 
        organization_id=current_user.organization_id, 
        new_role=role_data.role
    )
    
    # 監査ログに記録
    await crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="UPDATE_ROLE",
        resource_type="USER",
        resource_id=user_id,
        details=f"Role changed to {role_data.role}",
        organization_id=current_user.organization_id
    )
    
    return db_user

@router.post("/assign", response_model=schemas.UserOut)
@limiter.limit("5/minute")
async def add_user_to_organization(
    request: Request,
    data: schemas.UserOrganizationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(dependencies.admin_required),
):
    """
    既存のユーザーをメールアドレスで検索し、自分が管理する組織のメンバーとして追加します。
    """
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="あなたは組織に所属していないため、メンバーを追加できません。先に組織を作成してください。")

    db_user = await crud.assign_user_to_organization(
        db, 
        email=data.email, 
        organization_id=current_user.organization_id
    )

    # 監査ログに記録
    await crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="ADD_TO_ORG",
        resource_type="USER",
        resource_id=db_user.id,
        details=f"User {db_user.email} added to organization",
        organization_id=current_user.organization_id
    )

    return db_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(dependencies.admin_required),
):
    """
    指定したユーザーを削除します。管理者権限が必要です。
    """
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="組織に所属していないため、ユーザー管理機能を使用できません。"
        )
    
    await crud.delete_user(
        db, 
        user_id=user_id, 
        current_user_id=current_user.id, 
        organization_id=current_user.organization_id
    )
    
    # 監査ログに記録
    await crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="DELETE_USER",
        resource_type="USER",
        resource_id=user_id,
        details=f"User with ID {user_id} deleted",
        organization_id=current_user.organization_id
    )
