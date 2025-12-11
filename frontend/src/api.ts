import axios, { type AxiosResponse, AxiosError } from "axios";
import type { Todo, CreateTodoData, UpdateTodoData } from "./types";

// 💡 基本URLを定数として定義。環境変数で管理することも推奨されます。
const API_URL: string = "http://localhost:8000/todos";

// --- API関数 ---

/**
 * すべてのTo-Doアイテムを取得します。
 * @returns Todoアイテムの配列を解決するPromise
 */
export const getTodos = async (): Promise<Todo[]> => {
  try {
    // 💡 GETリクエストを実行。レスポンスの型も明示 (AxiosResponse<Todo[]>)
    const res: AxiosResponse<Todo[]> = await axios.get(API_URL);
    return res.data;
  } catch (error) {
    // 💡 エラーハンドリング: エラーが発生した場合、コンソールに出力し、呼び出し元にエラーを再スローします。
    // 呼び出し元で適切なUI表示などの処理を行えるようにします。
    console.error("Error fetching todos:", (error as AxiosError).message);
    throw error;
  }
};

/**
 * 新しいTo-Doアイテムを作成します。
 * @param title To-Doのタイトル
 * @param description To-Doの説明 (オプション)
 * @returns 作成されたTodoアイテムを解決するPromise
 */
export const createTodo = async ({ title, description }: CreateTodoData): Promise<Todo> => {
  try {
    // 💡 POSTリクエストを実行。ボディとしてデータを渡し、レスポンスの型も明示 (AxiosResponse<Todo>)
    const res: AxiosResponse<Todo> = await axios.post(API_URL, { title, description });
    return res.data;
  } catch (error) {
    console.error("Error creating todo:", (error as AxiosError).message);
    throw error;
  }
};

/**
 * 既存のTo-Doアイテムを更新します。
 * @param id 更新するTo-DoのID
 * @param data 更新するプロパティ(title, description, completed のうち1つ以上)を含むオブジェクト 
 * @returns 更新されたTodoアイテムを解決するPromise
 */
export const updateTodo = async (id: number, data: UpdateTodoData): Promise<Todo> => {
  try {
    // 💡 PATCHリクエストを実行。URLにIDを含め、更新データを渡します。
    const res: AxiosResponse<Todo> = await axios.patch(`${API_URL}/${id}`, data);
    return res.data;
  } catch (error) {
    console.error(`Error updating todo with ID ${id}:`, (error as AxiosError).message);
    throw error;
  }
};

/**
 * 既存のTo-Doアイテムを削除します。
 * @param id 削除するTo-DoのID
 * @returns 処理完了を解決するPromise (データは返されません)
 */
export const deleteTodo = async (id: number): Promise<void> => {
  try {
    // 💡 DELETEリクエストを実行。
    await axios.delete(`${API_URL}/${id}`);
    // 💡 削除成功時は何も返しません (Promise<void>)
  } catch (error) {
    console.error(`Error deleting todo with ID ${id}:`, (error as AxiosError).message);
    throw error;
  }
};