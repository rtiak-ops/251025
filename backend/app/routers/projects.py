from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, schemas
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("/", response_model=list[schemas.ProjectOut])
async def read_projects(
    db: AsyncSession = Depends(get_db),
    current_user: schemas.UserOut = Depends(get_current_user),
) -> list[schemas.ProjectOut]:
    """
    ログインユーザーのプロジェクト一覧を取得します。
    """
    return await crud.get_projects(db, owner_id=current_user.id)

@router.get("/summary", response_model=list[schemas.ProjectSummary])
async def read_project_summaries(
    db: AsyncSession = Depends(get_db),
    current_user: schemas.UserOut = Depends(get_current_user),
):
    """
    各プロジェクトのタスク統計を含むサマリーを取得します。
    """
    return await crud.get_project_summaries(db, owner_id=current_user.id)

@router.post("/", response_model=schemas.ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    project: schemas.ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: schemas.UserOut = Depends(get_current_user),
) -> schemas.ProjectOut:
    """
    新しいプロジェクトを作成します。
    """
    return await crud.create_project(db, project=project, owner_id=current_user.id)

@router.get("/{project_id}", response_model=schemas.ProjectOut)
async def read_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: schemas.UserOut = Depends(get_current_user),
) -> schemas.ProjectOut:
    """
    指定されたIDのプロジェクトを取得します。
    """
    project = await crud.get_project_by_id(db, project_id=project_id, owner_id=current_user.id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.patch("/{project_id}", response_model=schemas.ProjectOut)
async def update_project(
    project_id: int,
    project: schemas.ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: schemas.UserOut = Depends(get_current_user),
) -> schemas.ProjectOut:
    """
    指定されたIDのプロジェクトを更新します。
    """
    updated = await crud.update_project(db, project_id=project_id, project=project, owner_id=current_user.id)
    if updated is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return updated

@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: schemas.UserOut = Depends(get_current_user),
):
    """
    指定されたIDのプロジェクトを削除します。
    """
    deleted = await crud.delete_project(db, project_id=project_id, owner_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted successfully"}
