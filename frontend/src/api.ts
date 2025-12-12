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

// 環境変数からAPIベースURLを取得（ビルド時に設定される）
// 例: VITE_API_BASE_URL=http://localhost:8000 npm run dev
// 環境変数が設定されていない場合はデフォルトで localhost:8000 を使用
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// ローカルストレージに保存するトークンのキー名
const TOKEN_KEY = "auth_token";

// Axiosインスタンスを作成（全てのリクエストで使用される共通設定）
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
    // headersが未定義の場合は空オブジェクトを作成
    config.headers = config.headers ?? {};
    // AuthorizationヘッダーにBearerトークンを設定
    // サーバー側では "Authorization: Bearer <token>" の形式で受け取られる
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 設定を変更したconfigオブジェクトを返す
  return config;
});

// ----------------------------------------------------------------------
// トークン管理ユーティリティ関数
// ----------------------------------------------------------------------

// ローカルストレージから保存されているトークンを取得
export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);

// ローカルストレージからトークンを削除（ログアウト時に使用）
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// ローカルストレージにトークンを保存（ログイン時に使用）
export const saveToken = (token: string) =>
  localStorage.setItem(TOKEN_KEY, token);

// ----------------------------------------------------------------------
// 認証関連のAPI関数
// ----------------------------------------------------------------------

/**
 * 新規ユーザー登録を行う関数
 *
 * @param email - 登録するメールアドレス
 * @param password - 登録するパスワード
 * @returns 作成されたユーザー情報（パスワードは含まれません）
 * @throws Error - 登録に失敗した場合（既にメールアドレスが登録されている、ネットワークエラーなど）
 */
export const registerUser = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    // POST /auth/register エンドポイントにリクエストを送信
    const res: AxiosResponse<User> = await api.post("/auth/register", {
      email,
      password,
    });

    // レスポンスデータ（ユーザー情報）を返す
    return res.data;
  } catch (error) {
    // エラーをAxiosError型にキャスト
    const axiosError = error as AxiosError<{ detail?: string }>;

    // エラーメッセージを優先順位に従って取得
    // 1. サーバーから返された詳細メッセージ（detail）
    // 2. Axiosのエラーメッセージ
    // 3. デフォルトのメッセージ
    const errorMessage =
      axiosError.response?.data?.detail ||
      axiosError.message ||
      "ユーザー登録に失敗しました";

    // コンソールにエラーを出力（デバッグ用）
    console.error("Error registering user:", errorMessage);

    // エラーを再スロー（呼び出し元で処理できるようにする）
    throw new Error(errorMessage);
  }
};

/**
 * ユーザーログインを行う関数
 *
 * 認証が成功すると、取得したアクセストークンが自動的にローカルストレージに保存されます。
 * このトークンは以降のAPIリクエストで自動的に使用されます。
 *
 * @param email - ログインするメールアドレス
 * @param password - ログインパスワード
 * @returns アクセストークン情報（access_token, token_type）
 * @throws Error - ログインに失敗した場合（メールアドレスまたはパスワードが間違っている、ネットワークエラーなど）
 */
export const loginUser = async (
  email: string,
  password: string
): Promise<AuthToken> => {
  try {
    // POST /auth/login エンドポイントにリクエストを送信
    const res: AxiosResponse<AuthToken> = await api.post("/auth/login", {
      email,
      password,
    });

    // レスポンスから取得したアクセストークンをローカルストレージに保存
    // これにより、以降のAPIリクエストで自動的に認証情報が送信される
    saveToken(res.data.access_token);

    // トークン情報を返す
    return res.data;
  } catch (error) {
    // エラーをAxiosError型にキャスト
    const axiosError = error as AxiosError<{ detail?: string }>;

    // エラーメッセージを優先順位に従って取得
    const errorMessage =
      axiosError.response?.data?.detail ||
      axiosError.message ||
      "ログインに失敗しました";

    // コンソールにエラーを出力（デバッグ用）
    console.error("Error logging in:", errorMessage);

    // エラーを再スロー（呼び出し元で処理できるようにする）
    throw new Error(errorMessage);
  }
};

// ----------------------------------------------------------------------
// ToDo関連のAPI関数
// ----------------------------------------------------------------------

/**
 * 全てのToDoアイテムを取得する関数
 *
 * 認証が必要なエンドポイントです。リクエストには自動的に認証トークンが含まれます。
 *
 * @returns ToDoアイテムの配列
 * @throws Error - 取得に失敗した場合（認証エラー、ネットワークエラーなど）
 */
export const getTodos = async (): Promise<Todo[]> => {
  try {
    // GET /todos エンドポイントにリクエストを送信
    // リクエストインターセプターにより、認証トークンが自動的に追加される
    const res: AxiosResponse<Todo[]> = await api.get("/todos");

    // レスポンスデータ（ToDoリスト）を返す
    return res.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ detail?: string }>;

    // 401エラー（Unauthorized）の場合は認証が無効になっている
    // ローカルストレージからトークンを削除して、再度ログインを促す
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
 *
 * 認証が必要なエンドポイントです。リクエストには自動的に認証トークンが含まれます。
 *
 * @param title - ToDoのタイトル（必須）
 * @param description - ToDoの詳細説明（オプション）
 * @returns 作成されたToDoアイテム（ID、作成日時などが含まれる）
 * @throws Error - 作成に失敗した場合（バリデーションエラー、ネットワークエラーなど）
 */
export const createTodo = async ({
  title,
  description,
}: CreateTodoData): Promise<Todo> => {
  try {
    // POST /todos エンドポイントにリクエストを送信
    const res: AxiosResponse<Todo> = await api.post("/todos", {
      title,
      description,
    });

    // 作成されたToDoアイテムを返す
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
 *
 * PATCHメソッドを使用するため、更新したいフィールドのみを指定できます。
 * 認証が必要なエンドポイントです。
 *
 * @param id - 更新するToDoアイテムのID
 * @param data - 更新するデータ（title, description, completedのいずれか、または全て）
 * @returns 更新されたToDoアイテム
 * @throws Error - 更新に失敗した場合（アイテムが見つからない、バリデーションエラー、ネットワークエラーなど）
 */
export const updateTodo = async (
  id: number,
  data: UpdateTodoData
): Promise<Todo> => {
  try {
    // PATCH /todos/:id エンドポイントにリクエストを送信
    const res: AxiosResponse<Todo> = await api.patch(`/todos/${id}`, data);

    // 更新されたToDoアイテムを返す
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
 *
 * 認証が必要なエンドポイントです。リクエストには自動的に認証トークンが含まれます。
 *
 * @param id - 削除するToDoアイテムのID
 * @throws Error - 削除に失敗した場合（アイテムが見つからない、ネットワークエラーなど）
 */
export const deleteTodo = async (id: number): Promise<void> => {
  try {
    // DELETE /todos/:id エンドポイントにリクエストを送信
    await api.delete(`/todos/${id}`);
    // 削除は成功したが、レスポンスボディは返さない
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
