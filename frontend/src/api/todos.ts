import type { AxiosResponse } from "axios";
import { api } from "./client";
import type { Todo, CreateTodoData, UpdateTodoData } from "../types";

/**
 * ToDoリスト取得
 */
export const getTodos = async (q?: string): Promise<Todo[]> => {
  const res: AxiosResponse<Todo[]> = await api.get("/todos/", {
    params: { q }
  });
  return res.data;
};

/**
 * ToDo追加
 */
export const createTodo = async (
  data: CreateTodoData & { project_id?: number, status?: string, priority?: string, due_date?: string }
): Promise<Todo> => {
  const res: AxiosResponse<Todo> = await api.post("/todos/", data);
  return res.data;
};

/**
 * ToDo更新
 */
export const updateTodo = async (
  id: number,
  data: UpdateTodoData
): Promise<Todo> => {
  const res: AxiosResponse<Todo> = await api.patch(`/todos/${id}`, data);
  return res.data;
};

/**
 * ToDo削除
 */
export const deleteTodo = async (id: number): Promise<void> => {
  await api.delete(`/todos/${id}`);
};

/**
 * AIによるタスク分解
 */
export const breakdownTask = async (title: string): Promise<string[]> => {
  const res: AxiosResponse<{ subtasks: string[] }> = await api.post("/ai/breakdown", { title });
  return res.data.subtasks;
};

/**
 * 並び順の更新
 */
export const reorderTodos = async (todoIds: number[]): Promise<void> => {
    await api.post("/todos/reorder", { todo_ids: todoIds });
};
