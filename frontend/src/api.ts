import axios, { type AxiosResponse, AxiosError } from "axios";
import type {
  Todo,
  CreateTodoData,
  UpdateTodoData,
  User,
  AuthToken,
} from "./types";

// ----------------------------------------------------------------------
// API設定とトークン管理
// ----------------------------------------------------------------------

// 環境変数からAPIベースURLを取得
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// ローカルストレージに保存するトークンのキー名
const TOKEN_KEY = "auth_token";

// Axiosインスタンスを作成
const api = axios.create({ baseURL: API_BASE });

// ----------------------------------------------------------------------
// リクエストインターセプター: 全てのAPIリクエストに認証トークンを自動追加
// ----------------------------------------------------------------------

// リクエストが送信される前に実行される処理
api.interceptors.request.use((config) => {
  // ローカルストレージから認証トークンを取得
  const token = localStorage.getItem(TOKEN_KEY);

  // トークンが存在する場合、リクエストヘッダーに認証情報を追加
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ----------------------------------------------------------------------
// トークン管理ユーティリティ関数
// ----------------------------------------------------------------------

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);

export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const saveToken = (token: string) =>
  localStorage.setItem(TOKEN_KEY, token);

// ----------------------------------------------------------------------
// 認証関連のAPI関数
// ----------------------------------------------------------------------

/**
 * 新規ユーザー登録を行う関数
 *
 * @throws AxiosError - 登録に失敗した場合
 */
export const registerUser = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    const res: AxiosResponse<User> = await api.post("/auth/register", {
      email,
      password,
    });
    return res.data;
  } catch (error) {
    // 🚨 修正箇所: Errorでラップせず、AxiosErrorをそのままスローする
    console.error("Error registering user:", error);
    throw error;
  }
};

/**
 * ユーザーログインを行う関数
 *
 * @throws AxiosError - ログインに失敗した場合
 */
export const loginUser = async (
  email: string,
  password: string
): Promise<AuthToken> => {
  try {
    const res: AxiosResponse<AuthToken> = await api.post("/auth/login", {
      email,
      password,
    });

    saveToken(res.data.access_token);
    return res.data;
  } catch (error) {
    // 🚨 修正箇所: Errorでラップせず、AxiosErrorをそのままスローする
    console.error("Error logging in:", error);
    throw error;
  }
};

// ----------------------------------------------------------------------
// ToDo関連のAPI関数 (この部分は変更なし)
// ----------------------------------------------------------------------

/**
 * 全てのToDoアイテムを取得する関数
 */
export const getTodos = async (): Promise<Todo[]> => {
  try {
    const res: AxiosResponse<Todo[]> = await api.get("/todos");
    return res.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ detail?: string }>;

    if (axiosError.response?.status === 401) {
      clearToken();
    }

    const errorMessage =
      axiosError.response?.data?.detail ||
      axiosError.message ||
      "ToDoリストの取得に失敗しました";

    console.error("Error fetching todos:", errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * 新しいToDoアイテムを作成する関数
 */
export const createTodo = async ({
  title,
  description,
}: CreateTodoData): Promise<Todo> => {
  try {
    const res: AxiosResponse<Todo> = await api.post("/todos", {
      title,
      description,
    });
    return res.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ detail?: string }>;

    const errorMessage =
      axiosError.response?.data?.detail ||
      axiosError.message ||
      "ToDoの作成に失敗しました";

    console.error("Error creating todo:", errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * 既存のToDoアイテムを更新する関数
 */
export const updateTodo = async (
  id: number,
  data: UpdateTodoData
): Promise<Todo> => {
  try {
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
 * ToDoアイテムを削除する関数
 */
export const deleteTodo = async (id: number): Promise<void> => {
  try {
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

/**
 * AIによるタスク分解リクエスト
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
 * Todoの並び順を更新する
 */
export const reorderTodos = async (todoIds: number[]): Promise<void> => {
    await api.post("/todos/reorder", { todo_ids: todoIds });
};