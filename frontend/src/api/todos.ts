import type { AxiosResponse } from "axios";
import { api } from "./client";
import type { Todo, CreateTodoData, UpdateTodoData } from "../types";

/**
 * 【Todoアイテム APIサービス】
 * サーバー側で定義されたタスク管理エンドポイントとの通信を担当します。
 */

/**
 * ログインユーザーのToDoリストを取得します。
 * @param q 検索キーワード（タイトルまたは説明文を対象）
 */
export const getTodos = async (q?: string): Promise<Todo[]> => {
  const res: AxiosResponse<Todo[]> = await api.get("/todos/", {
    params: { q }
  });
  return res.data;
};

/**
 * 新しいToDoアイテムを作成します。
 * プロジェクトIDや優先度、期限などの追加情報を含めることが可能です。
 */
export const createTodo = async (
  data: CreateTodoData & { project_id?: number, status?: string, priority?: string, due_date?: string }
): Promise<Todo> => {
  const res: AxiosResponse<Todo> = await api.post("/todos/", data);
  return res.data;
};

/**
 * 指定されたIDのToDoの内容（タイトル、完了状態など）を更新します。
 */
export const updateTodo = async (
  id: number,
  data: UpdateTodoData
): Promise<Todo> => {
  const res: AxiosResponse<Todo> = await api.patch(`/todos/${id}`, data);
  return res.data;
};

/**
 * 指定されたIDのToDoを物理削除します。
 */
export const deleteTodo = async (id: number): Promise<void> => {
  await api.delete(`/todos/${id}`);
};

/**
 * 【AI機能】大規模タスクをサブタスクに分解
 * 入力されたタイトルに対してAI（Gemini/GPT）が具体化案を提案します。
 */
export const breakdownTask = async (title: string): Promise<string[]> => {
  const res: AxiosResponse<{ subtasks: string[] }> = await api.post("/ai/breakdown", { title });
  return res.data.subtasks;
};

/**
 * ドラッグ&ドロップなどによる並び順の変更を確定させます。
 * @param todoIds 正しい並び順に沿ったIDの配列
 */
export const reorderTodos = async (todoIds: number[]): Promise<void> => {
    await api.post("/todos/reorder", { todo_ids: todoIds });
};
