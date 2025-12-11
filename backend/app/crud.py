from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete # delete もインポートして、より明示的に削除を行うことも可能
from typing import Optional # 型ヒントの充実
from . import models, schemas # models は DB スキーマ、schemas は Pydantic スキーマを想定

# Todo リストを取得する
async def get_todos(db: AsyncSession) -> list[models.Todo]:
    """
    データベースから全ての Todo アイテムを取得します。
    """
    # SELECT * FROM todos のクエリを作成し、非同期で実行
    # execute() は Result オブジェクトを返す
    result = await db.execute(select(models.Todo))
    
    # scalars().all() で、Result オブジェクトから Todo オブジェクトのリストを抽出
    return result.scalars().all()

# 新しい Todo を作成する
async def create_todo(db: AsyncSession, todo: schemas.TodoCreate) -> models.Todo:
    """
    新しい Todo アイテムを作成し、DB にコミットします。
    """
    # Pydantic モデル (schemas.TodoCreate) のデータを DB モデル (models.Todo) に展開してインスタンス化
    new_todo = models.Todo(**todo.model_dump()) # .dict() の代わりに .model_dump() を使用（Pydantic v2 推奨）
    
    # セッションに追加 (INSERT 操作)
    db.add(new_todo)
    
    # データベースへの変更を確定 (コミット)
    await db.commit()
    
    # データベースから最新の情報を再読み込み (主に ID やデフォルト値などを取得)
    await db.refresh(new_todo)
    
    # 作成された Todo オブジェクトを返す
    return new_todo

# Todo を ID で更新する
async def update_todo(db: AsyncSession, todo_id: int, todo: schemas.TodoUpdate) -> Optional[models.Todo]:
    """
    指定された ID の Todo アイテムを更新します。
    更新対象のフィールドは Pydantic スキーマ (TodoUpdate) に含まれるもののみです。
    """
    # ID を条件に Todo アイテムを取得するクエリを実行
    # .where() で WHERE 句を指定
    result = await db.execute(
        select(models.Todo).where(models.Todo.id == todo_id)
    )
    
    # 結果から単一のオブジェクトを取得。存在しなければ None
    db_todo = result.scalar_one_or_none()
    
    # Todo が存在する場合のみ更新処理を実行
    if db_todo:
        # Pydantic モデルのデータを辞書として取得
        # .model_dump(exclude_unset=True) を使うと、ユーザーが設定しなかったフィールド（None ではなく未設定）を除外できる
        update_data = todo.model_dump(exclude_unset=True) 
        
        # 取得した辞書のキーと値を使って、DB オブジェクトの属性をループで更新
        for key, value in update_data.items():
            setattr(db_todo, key, value)
            
        # データベースへの変更を確定 (UPDATE 操作)
        await db.commit()
        
        # データベースから最新の情報を再読み込み
        await db.refresh(db_todo)
        
    # 更新された Todo オブジェクト、または None を返す
    return db_todo

# Todo を ID で削除する
async def delete_todo(db: AsyncSession, todo_id: int) -> Optional[models.Todo]:
    """
    指定された ID の Todo アイテムを削除します。
    削除された Todo オブジェクトを返します。
    """
    # 削除対象の Todo を ID で取得
    result = await db.execute(
        select(models.Todo).where(models.Todo.id == todo_id)
    )
    db_todo = result.scalar_one_or_none()
    
    # Todo が存在する場合のみ削除処理を実行
    if db_todo:
        # セッションからオブジェクトを削除 (DELETE 操作)
        await db.delete(db_todo)
        
        # データベースへの変更を確定 (コミット)
        await db.commit()
        
    # 削除された Todo オブジェクト、または None を返す
    # (FastAPI の慣習として、削除したオブジェクトを返すことが多いため)
    return db_todo

# ---
# 🌟 (補足) 特定の ID の Todo を取得する関数を追加すると便利です
async def get_todo_by_id(db: AsyncSession, todo_id: int) -> Optional[models.Todo]:
    """
    指定された ID の Todo アイテムを単体で取得します。
    """
    result = await db.execute(
        select(models.Todo).where(models.Todo.id == todo_id)
    )
    # scalar_one_or_none() を使用すると、結果が 0 または 1 個の場合にオブジェクトを返す
    return result.scalar_one_or_none()