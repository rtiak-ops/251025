import axios, { type AxiosResponse, AxiosError } from "axios";
import type {
  Todo,
  CreateTodoData,
  UpdateTodoData,
  User,
  AuthToken,
} from "./types";

// ============================================================================
// API通信の設定ファイル (API Client Configuration)
// ============================================================================
// バックエンドサーバーとデータをやり取りするための設定と関数をまとめたファイルです。
// 通信には "Axios (アクシオス)" というライブラリを使用しています。

// ----------------------------------------------------------------------------
// 1. 基本設定 (Basic Setup)
// ----------------------------------------------------------------------------

// 接続先のサーバーURL (ベースURL) を決定します
// 環境変数 (VITE_API_BASE_URL) が設定されていればそれを使い、なければ相対パス（同じサーバー）を使います
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// ブラウザのローカルストレージに保存する認証トークンのキー名
// キーを使って保存・取得・削除を行います
const TOKEN_KEY = "auth_token";

// Axiosのインスタンス（通信するための道具）を作成します
// これを使うことで、毎回URLの最初 (http://localhost:8000) を書かなくて済みます
const api = axios.create({ baseURL: API_BASE });

// ----------------------------------------------------------------------------
// 2. リクエストの前処理 (Interceptors)
// ----------------------------------------------------------------------------

// apiを使ってリクエストを送る「直前」に自動で行う処理を登録します
// ここでは、ログインしている場合に「認証トークン」をヘッダーに自動で追加しています
api.interceptors.request.use((config) => {
  // 保存されているトークンを取り出す
  const token = localStorage.getItem(TOKEN_KEY);

  // トークンがあれば、リクエストの「Authorization」ヘッダーに追加する
  // これにより、サーバーは「誰からのリクエストか」を識別できます
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config; // 変更した設定でリクエストを続行
});

// ----------------------------------------------------------------------------
// 3. トークン管理の便利関数 (Token Helpers)
// ----------------------------------------------------------------------------

// 保存されているトークンを取得する関数
export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);

// トークンを削除する関数 (ログアウト時などに使用)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// トークンを保存する関数 (ログイン成功時に使用)
export const saveToken = (token: string) =>
  localStorage.setItem(TOKEN_KEY, token);

// ----------------------------------------------------------------------------
// 4. API関数: 認証関連 (Authentication API)
// ----------------------------------------------------------------------------

/**
 * ユーザー登録 (サインアップ) を行う関数
 * @param email - 登録するメールアドレス
 * @param password - 登録するパスワード
 * @returns 登録されたユーザー情報
 */
export const registerUser = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    // POSTリクエストで /auth/register にデータを送信
    const res: AxiosResponse<User> = await api.post("/auth/register", {
      email,
      password,
    });
    return res.data; // サーバーからのレスポンスデータを返す
  } catch (error) {
    // エラーが起きた場合は、そのまま呼び出し元に伝えます
    // ※呼び出し元で適切なエラーメッセージを表示するため
    console.error("Error registering user:", error);
    throw error;
  }
};

/**
 * ログインを行う関数
 * @param email - メールアドレス
 * @param password - パスワード
 * @returns 認証トークン情報
 */
export const loginUser = async (
  email: string,
  password: string
): Promise<AuthToken> => {
  try {
    // POSTリクエストで /auth/login にデータを送信
    const res: AxiosResponse<AuthToken> = await api.post("/auth/login", {
      email,
      password,
    });

    // ログインに成功したら、受け取ったアクセストークンを保存する
    saveToken(res.data.access_token);
    return res.data;
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
};

// ----------------------------------------------------------------------------
// 5. API関数: ToDo関連 (ToDo API)
// ----------------------------------------------------------------------------

/**
 * 自分のToDoリストを全て取得する関数
 * @returns Todoアイテムの配列
 */
export const getTodos = async (): Promise<Todo[]> => {
  try {
    // GETリクエストで /todos/ からデータを取得
    const res: AxiosResponse<Todo[]> = await api.get("/todos/");
    return res.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ detail?: any }>;

    // もし「401 Unauthorized (認証エラー)」なら、トークンが無効なので削除する
    if (axiosError.response?.status === 401) {
      clearToken();
    }

    let errorMessage = "ToDoリストの取得に失敗しました";
    if (axiosError.response?.data?.detail) {
      const detail = axiosError.response.data.detail;
      errorMessage = typeof detail === "string" 
        ? detail 
        : (Array.isArray(detail) ? detail[0].msg : JSON.stringify(detail));
    } else if (axiosError.message) {
      errorMessage = axiosError.message;
    }

    console.error("Error fetching todos:", errorMessage);
    // 新しいエラーとして投げ直す (UI側でcatchして表示するため)
    throw new Error(errorMessage);
  }
};

/**
 * 新しいToDoを追加する関数
 * @param data - 作成するTodoのデータ (タイトル、説明)
 * @returns 作成されたTodoデータ
 */
export const createTodo = async ({
  title,
  description,
}: CreateTodoData): Promise<Todo> => {
  try {
    const res: AxiosResponse<Todo> = await api.post("/todos/", {
      title,
      description,
    });
    return res.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ detail?: any }>;
    let errorMessage = "ToDoの作成に失敗しました";

    if (axiosError.response?.data?.detail) {
      const detail = axiosError.response.data.detail;
      errorMessage = typeof detail === "string" 
        ? detail 
        : (Array.isArray(detail) ? detail[0].msg : JSON.stringify(detail));
    } else if (axiosError.message) {
      errorMessage = axiosError.message;
    }

    console.error("Error creating todo:", errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * ToDoの内容を更新する関数
 * @param id - 更新するTodoのID
 * @param data - 更新したいデータ (タイトルだけ、完了状態だけ、なども可)
 * @returns 更新後のTodoデータ
 */
export const updateTodo = async (
  id: number,
  data: UpdateTodoData
): Promise<Todo> => {
  try {
    // PATCHリクエスト: データの一部だけを書き換えるときに使います
    const res: AxiosResponse<Todo> = await api.patch(`/todos/${id}`, data);
    return res.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ detail?: string }>;

    const errorMessage =
      axiosError.response?.data?.detail ||
      axiosError.message ||
      `ToDo(ID: ${id})の更新に失敗しました`;

    console.error(`Error updating todo with ID ${id}:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * ToDoを削除する関数
 * @param id - 削除するTodoのID
 */
export const deleteTodo = async (id: number): Promise<void> => {
  try {
    // DELETEリクエスト: データを消去するときに使います
    await api.delete(`/todos/${id}`);
  } catch (error) {
    const axiosError = error as AxiosError<{ detail?: string }>;

    const errorMessage =
      axiosError.response?.data?.detail ||
      axiosError.message ||
      `ToDo(ID: ${id})の削除に失敗しました`;

    console.error(`Error deleting todo with ID ${id}:`, errorMessage);
    throw new Error(errorMessage);
  }
};

// ----------------------------------------------------------------------------
// 6. API関数: その他の機能 (Other Features)
// ----------------------------------------------------------------------------

/**
 * AIを使ってタスクを細分化する関数
 * @param title - 元の大きなタスクのタイトル
 * @returns 細分化されたサブタスクのリスト (文字列の配列)
 */
export const breakdownTask = async (title: string): Promise<string[]> => {
  try {
    const res: AxiosResponse<{ subtasks: string[] }> = await api.post("/ai/breakdown", { title });
    return res.data.subtasks;
  } catch (error) {
    console.error("Error breaking down task:", error);
    throw error;
  }
};

/**
 * Todoの並び順を更新する関数
 * ドラッグ&ドロップで並び替えた後に呼び出されます
 * @param todoIds - 並び替え後のTodo IDの配列
 */
export const reorderTodos = async (todoIds: number[]): Promise<void> => {
    // 並び順だけをサーバーに送信して保存してもらう
    await api.post("/todos/reorder", { todo_ids: todoIds });
};
