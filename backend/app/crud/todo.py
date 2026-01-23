from __future__ import annotations
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from .. import models, schemas

async def get_todos(db: AsyncSession, owner_id: int, project_id: int | None = None, q: str | None = None) -> list[models.Todo]:
    """
    Todoアイテムを取得する関数
    """
    stmt = select(models.Todo).order_by(models.Todo.order)
    stmt = stmt.where(models.Todo.owner_id == owner_id)

    if project_id:
        stmt = stmt.where(models.Todo.project_id == project_id)
    
    if q:
        stmt = stmt.where(
            models.Todo.title.ilike(f"%{q}%") | models.Todo.description.ilike(f"%{q}%")
        )
        
    result = await db.execute(stmt)
    return result.scalars().all()

async def create_todo(db: AsyncSession, todo: schemas.TodoCreate, owner_id: int) -> models.Todo:
    """
    新しいTodoアイテムを作成する関数
    """
    new_todo = models.Todo(**todo.model_dump(), owner_id=owner_id) 
    db.add(new_todo)
    await db.commit()
    await db.refresh(new_todo)
    return new_todo

async def update_todo(db: AsyncSession, todo_id: int, todo: schemas.TodoUpdate, owner_id: int) -> models.Todo | None:
    """
    指定されたIDのTodoアイテムを更新する関数
    """
    result = await db.execute(
        select(models.Todo).where(models.Todo.id == todo_id, models.Todo.owner_id == owner_id)
    )
    db_todo = result.scalar_one_or_none()
    
    if db_todo:
        update_data = todo.model_dump(exclude_unset=True) 
        for key, value in update_data.items():
            setattr(db_todo, key, value)
            
        await db.commit()
        await db.refresh(db_todo)
        
    return db_todo

async def delete_todo(db: AsyncSession, todo_id: int, owner_id: int) -> models.Todo | None:
    """
    指定されたIDのTodoアイテムを削除する関数
    """
    result = await db.execute(
        select(models.Todo).where(models.Todo.id == todo_id, models.Todo.owner_id == owner_id)
    )
    db_todo = result.scalar_one_or_none()
    
    if db_todo:
        await db.delete(db_todo)
        await db.commit()
        
    return db_todo

async def get_todo_by_id(db: AsyncSession, todo_id: int, owner_id: int) -> models.Todo | None:
    """
    指定されたIDのTodoアイテムを単体で取得する関数
    """
    result = await db.execute(
        select(models.Todo).where(
            models.Todo.id == todo_id,
            models.Todo.owner_id == owner_id
        )
    )
    return result.scalar_one_or_none()

async def reorder_todos(db: AsyncSession, todo_ids: list[int], owner_id: int):
    """
    Todoのリスト順序を一括更新する関数
    """
    stmt = (
        select(models.Todo)
        .where(models.Todo.id.in_(todo_ids))
        .where(models.Todo.owner_id == owner_id)
    )
    result = await db.execute(stmt)
    todos = {t.id: t for t in result.scalars().all()}
    
    for index, t_id in enumerate(todo_ids):
        if t_id in todos:
            todo = todos[t_id]
            if todo.order != index:
                todo.order = index
                db.add(todo)
    
    await db.commit()
