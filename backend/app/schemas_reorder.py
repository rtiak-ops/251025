from pydantic import BaseModel
from typing import List

class TodoReorder(BaseModel):
    todo_ids: List[int]
