from pydantic import BaseModel

class TodoReorder(BaseModel):
    todo_ids: list[int]
