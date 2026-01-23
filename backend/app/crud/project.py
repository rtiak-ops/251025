from __future__ import annotations
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from .. import models, schemas

async def get_projects(db: AsyncSession, user_id: int) -> list[models.Project]:
    """
    特定ユーザーが閲覧可能な全てのプロジェクトを取得する関数。
    """
    user_result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = user_result.scalar_one_or_none()
    
    if not user or not user.organization_id:
        collab_stmt = select(models.ProjectCollaborator.project_id).where(models.ProjectCollaborator.user_id == user_id)
        stmt = select(models.Project).where(
            (models.Project.owner_id == user_id) | 
            (models.Project.id.in_(collab_stmt))
        )
    else:
        stmt = select(models.Project).where(
            (models.Project.organization_id == user.organization_id)
        )

    stmt = stmt.options(
        selectinload(models.Project.collaborators)
        .selectinload(models.ProjectCollaborator.user)
    ).order_by(models.Project.created_at.desc())

    result = await db.execute(stmt)
    return result.scalars().all()

async def get_project_by_id(db: AsyncSession, project_id: int, user_id: int) -> models.Project | None:
    """
    指定されたIDのプロジェクトを取得する関数。
    """
    stmt = (
        select(models.Project)
        .where(models.Project.id == project_id)
        .options(selectinload(models.Project.collaborators))
    )
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()

    if not project:
        return None
    
    if project.owner_id == user_id:
        return project
    
    is_collab = any(c.user_id == user_id for c in project.collaborators)
    if is_collab:
        return project
        
    return None

async def is_project_editor(db: AsyncSession, project_id: int, user_id: int) -> bool:
    """
    ユーザーにプロジェクトの編集権限があるか確認。
    """
    stmt = select(models.Project).where(models.Project.id == project_id)
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()
    
    if not project:
        return False
    
    if project.owner_id == user_id:
        return True
        
    collab_stmt = select(models.ProjectCollaborator).where(
        models.ProjectCollaborator.project_id == project_id,
        models.ProjectCollaborator.user_id == user_id,
        models.ProjectCollaborator.permission == "editor"
    )
    collab_result = await db.execute(collab_stmt)
    return collab_result.scalar_one_or_none() is not None

async def create_project(db: AsyncSession, project: schemas.ProjectCreate, owner_id: int) -> models.Project:
    """
    新しいプロジェクトを作成する関数。
    """
    user_result = await db.execute(select(models.User).where(models.User.id == owner_id))
    user = user_result.scalar_one_or_none()
    org_id = user.organization_id if user else None

    db_project = models.Project(**project.model_dump(), owner_id=owner_id, organization_id=org_id)
    db.add(db_project)
    await db.commit()
    
    stmt = select(models.Project).where(models.Project.id == db_project.id).options(
        selectinload(models.Project.collaborators)
    )
    result = await db.execute(stmt)
    db_project = result.scalar()
    return db_project

async def update_project(db: AsyncSession, project_id: int, project: schemas.ProjectUpdate, user_id: int) -> models.Project | None:
    """
    プロジェクトを更新する関数
    """
    if not await is_project_editor(db, project_id, user_id):
        return None
        
    stmt = select(models.Project).where(models.Project.id == project_id)
    result = await db.execute(stmt)
    db_project = result.scalar_one_or_none()
    
    if not db_project:
        return None
    
    update_data = project.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_project, key, value)
    
    await db.commit()
    await db.refresh(db_project)
    return db_project

async def delete_project(db: AsyncSession, project_id: int, user_id: int) -> models.Project | None:
    """
    プロジェクトを削除する関数（オーナーのみ）
    """
    stmt = select(models.Project).where(models.Project.id == project_id, models.Project.owner_id == user_id)
    result = await db.execute(stmt)
    db_project = result.scalar_one_or_none()
    
    if db_project:
        await db.delete(db_project)
        await db.commit()
    return db_project

async def get_project_summaries(db: AsyncSession, user_id: int):
    """
    各プロジェクトのタスク統計を含むサマリーを取得。
    """
    projects = await get_projects(db, user_id)
    
    summaries = []
    for p in projects:
        todo_stmt = select(func.count(models.Todo.id)).where(models.Todo.project_id == p.id)
        completed_stmt = select(func.count(models.Todo.id)).where(models.Todo.project_id == p.id, models.Todo.completed == True)
        
        todo_count = (await db.execute(todo_stmt)).scalar() or 0
        completed_count = (await db.execute(completed_stmt)).scalar() or 0
        
        role = "owner" if p.owner_id == user_id else "collaborator"

        collaborators_out = []
        for c in p.collaborators:
            collaborators_out.append({
                "id": c.id,
                "user_id": c.user_id,
                "permission": c.permission,
                "user_email": c.user.email if c.user else None
            })

        summary = {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
            "owner_id": p.owner_id,
            "todo_count": todo_count,
            "completed_count": completed_count,
            "role": role,
            "collaborators": collaborators_out
        }
        summaries.append(summary)
        
    return summaries

async def add_collaborator(db: AsyncSession, project_id: int, collaborator: schemas.CollaboratorCreate) -> models.ProjectCollaborator:
    db_collab = models.ProjectCollaborator(
        project_id=project_id,
        user_id=collaborator.user_id,
        permission=collaborator.permission
    )
    db.add(db_collab)
    await db.commit()
    await db.refresh(db_collab)
    return db_collab

async def remove_collaborator(db: AsyncSession, project_id: int, user_id: int):
    stmt = delete(models.ProjectCollaborator).where(
        models.ProjectCollaborator.project_id == project_id,
        models.ProjectCollaborator.user_id == user_id
    )
    await db.execute(stmt)
    await db.commit()
