from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from .. import crud, schemas, crud_audit, models
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("/", response_model=list[schemas.ProjectOut])
async def read_projects(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> list[schemas.ProjectOut]:
    """
    ログインユーザーのプロジェクト一覧を取得します。
    """
    return await crud.get_projects(db, user_id=current_user.id)

@router.get("/summary", response_model=list[schemas.ProjectSummary])
async def read_project_summaries(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    各プロジェクトのタスク統計を含むサマリーを取得します。
    """
    return await crud.get_project_summaries(db, user_id=current_user.id)

@router.post("/", response_model=schemas.ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    project: schemas.ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> schemas.ProjectOut:
    user_id = current_user.id
    org_id = current_user.organization_id
    new_project = await crud.create_project(db, project=project, owner_id=user_id)
    
    # 監査ログを記録
    await crud_audit.create_audit_log(
        db, 
        user_id=user_id, 
        action="CREATE", 
        resource_type="PROJECT", 
        resource_id=new_project.id,
        details={"name": new_project.name},
        organization_id=org_id
    )
    
    return new_project

@router.get("/{project_id}", response_model=schemas.ProjectOut)
async def read_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> schemas.ProjectOut:
    """
    指定されたIDのプロジェクトを取得します。
    """
    project = await crud.get_project_by_id(db, project_id=project_id, user_id=current_user.id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.patch("/{project_id}", response_model=schemas.ProjectOut)
async def update_project(
    project_id: int,
    project: schemas.ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> schemas.ProjectOut:
    user_id = current_user.id
    org_id = current_user.organization_id
    updated = await crud.update_project(db, project_id=project_id, project=project, user_id=user_id)
    if updated is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # 監査ログを記録
    await crud_audit.create_audit_log(
        db, 
        user_id=user_id, 
        action="UPDATE", 
        resource_type="PROJECT", 
        resource_id=updated.id,
        details=project.model_dump(exclude_unset=True),
        organization_id=org_id
    )
    
    return updated

@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user_id = current_user.id
    org_id = current_user.organization_id
    deleted = await crud.delete_project(db, project_id=project_id, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # 監査ログを記録
    await crud_audit.create_audit_log(
        db, 
        user_id=user_id, 
        action="DELETE", 
        resource_type="PROJECT", 
        resource_id=project_id,
        organization_id=org_id
    )
    
    return {"message": "Project deleted successfully"}

@router.post("/{project_id}/collaborators", response_model=schemas.CollaboratorOut)
async def add_collaborator(
    project_id: int,
    collaborator: schemas.CollaboratorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    プロジェクトにメンバーを追加します。
    """
    # 権限チェック: プロジェクトのオーナーのみがメンバーを追加可能
    project = await crud.get_project_by_id(db, project_id=project_id, user_id=current_user.id)
    if not project:
        raise HTTPException(status_code=403, detail="Only owners can add collaborators")
    
    return await crud.add_collaborator(db, project_id=project_id, collaborator=collaborator)

@router.delete("/{project_id}/collaborators/{user_id}")
async def remove_collaborator(
    project_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    プロジェクトからメンバーを削除します。
    """
    # 権限チェック: プロジェクトのオーナーのみがメンバーを削除可能
    project = await crud.get_project_by_id(db, project_id=project_id, user_id=current_user.id)
    if not project:
        raise HTTPException(status_code=403, detail="Only owners can remove collaborators")
    
    await crud.remove_collaborator(db, project_id=project_id, user_id=user_id)
    return {"message": "Collaborator removed"}
