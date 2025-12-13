from fastapi import APIRouter, Depends, HTTPException, status # statusをインポート
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from .. import crud, schemas
from ..auth import get_current_user

# APIRouterのインスタンスを作成
# prefix="/todos"で全てのルーティングが/todosから始まる
# tags=["Todos"]でAPIドキュメント（Swagger UI/Redoc）でのグループ名を指定
router = APIRouter(prefix="/todos", tags=["Todos"])

# --- ToDoアイテムの読み取り（全件取得） ---
@router.get(
    "/",
    response_model=list[schemas.TodoOut], # レスポンスのPydanticモデルを指定（リスト型であることに注意）
    status_code=status.HTTP_200_OK # 成功時のHTTPステータスコードを明示的に指定（200 OK）
)
# Depends(get_db)により、リクエストごとに非同期DBセッションを取得
async def read_todos(
    db: AsyncSession = Depends(get_db),
    current_user: schemas.UserOut = Depends(get_current_user),
) -> list[schemas.TodoOut]:
    """
    全てのToDoアイテムを取得します。
    """
    # crudモジュールの非同期関数を呼び出し、データベースからToDoリストを取得
    todos = await crud.get_todos(db, owner_id=current_user.id)
    return todos # 取得したToDoリストを返す

# --- ToDoアイテムの作成 ---
@router.post(
    "/",
    response_model=schemas.TodoOut, # レスポンスのPydanticモデルを指定（作成されたアイテム）
    status_code=status.HTTP_201_CREATED # 作成成功時のHTTPステータスコードを明示的に指定（201 Created）
)
# リクエストボディをschemas.TodoCreateモデルで検証
async def create_todo(
    todo: schemas.TodoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: schemas.UserOut = Depends(get_current_user),
) -> schemas.TodoOut:
    """
    新しいToDoアイテムを作成します。
    """
    # crudモジュールの非同期関数を呼び出し、ToDoアイテムを作成
    new_todo = await crud.create_todo(db, todo=todo, owner_id=current_user.id)
    return new_todo # 作成されたToDoアイテムを返す

# --- ToDoアイテムの更新（部分更新/全体更新） ---
@router.patch(
    "/{todo_id}",
    response_model=schemas.TodoOut, # レスポンスのPydanticモデルを指定（更新されたアイテム）
    status_code=status.HTTP_200_OK # 成功時のHTTPステータスコードを明示的に指定（200 OK）
)
# todo_id（パスパラメータ）とtodo（リクエストボディ）を受け取る
async def update_todo(
    todo_id: int,
    todo: schemas.TodoUpdate, # リクエストボディをschemas.TodoUpdateモデルで検証
    db: AsyncSession = Depends(get_db),
    current_user: schemas.UserOut = Depends(get_current_user),
) -> schemas.TodoOut:
    """
    指定されたIDのToDoアイテムを更新します。
    """
    # crudモジュールの非同期関数を呼び出し、ToDoアイテムを更新
    updated = await crud.update_todo(db, todo_id=todo_id, todo=todo, owner_id=current_user.id)
    
    # 更新対象が見つからなかった場合
    if updated is None: # Noneチェックのほうがより明示的で安全
        # 404 Not Foundエラーを発生
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, # 404 Not Found
            detail=f"Todo with id {todo_id} not found" # 詳細なエラーメッセージ
        )
    return updated # 更新されたToDoアイテムを返す

# --- ToDoアイテムの削除 ---
@router.delete(
    "/{todo_id}",
    status_code=status.HTTP_200_OK, # 成功時のHTTPステータスコードを明示的に指定（200 OK）
    # 削除成功時はレスポンスボディとしてJSONオブジェクトを返すためresponse_modelは不要
)
# todo_id（パスパラメータ）を受け取る
async def delete_todo(
    todo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: schemas.UserOut = Depends(get_current_user),
) -> dict: # 辞書型（JSONオブジェクト）を返すことを示唆
    """
    指定されたIDのToDoアイテムを削除します。
    """
    # crudモジュールの非同期関数を呼び出し、ToDoアイテムを削除
    deleted = await crud.delete_todo(db, todo_id=todo_id, owner_id=current_user.id)
    
    # 削除対象が見つからなかった場合
    if not deleted: # bool値のFalseが返された場合（削除対象が見つからない/削除に失敗）
        # 404 Not Foundエラーを発生
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, # 404 Not Found
            detail=f"Todo with id {todo_id} not found" # 詳細なエラーメッセージ
        )
    # 削除成功メッセージを返す
    return {"message": "Deleted successfully", "todo_id": todo_id}

# --- ToDo並び替え ---
@router.post("/reorder", status_code=status.HTTP_200_OK)
async def reorder_todos(
    payload: schemas.TodoReorder,
    db: AsyncSession = Depends(get_db),
    current_user: schemas.UserOut = Depends(get_current_user),
):
    """
    ToDoの並び順を更新します。
    """
    await crud.reorder_todos(db, todo_ids=payload.todo_ids, owner_id=current_user.id)
    return {"message": "Order updated"}