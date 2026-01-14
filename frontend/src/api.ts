import axios, { type AxiosResponse, AxiosError } from "axios";
import type {
  Todo,
  CreateTodoData,
  UpdateTodoData,
  User,
  AuthToken,
  Project,
  CreateProjectData,
  UpdateProjectData,
  ProjectSummary,
  Collaborator,
  AuditLog,
  SystemStats,
  HealthStatus,
  Organization,
  CreateOrganizationData,
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
const API_BASE = import.meta.env.VITE_API_BASE_URL || ""; // 環境変数があれば使い、なければ空（相対パス）にします。

// ブラウザのローカルストレージに保存する認証トークンのキー名
const TOKEN_KEY = "auth_token"; // トークンを保存・取得する際の「名前」を定義します。

// Axiosのインスタンス（通信するための道具）を作成します
export const api = axios.create({ baseURL: API_BASE }); // 基本となるURLを設定した共通の道具を作ります。
export default api; // 他のファイルでもこの道具を使えるようにします。

// ----------------------------------------------------------------------------
// 2. リクエストの前処理 (Interceptors)
// ----------------------------------------------------------------------------

// apiを使ってリクエストを送る「直前」に自動で行う処理を登録します
api.interceptors.request.use((config) => { // 全てのリクエストに介入（インターセプト）します。
  // 保存されているトークンを取り出す
  const token = localStorage.getItem(TOKEN_KEY); // ブラウザの保存領域からトークンを読み出します。

  // トークンがあれば、リクエストの「Authorization」ヘッダーに追加する
  if (token) { // トークンが存在する場合のみ実行します。
    config.headers = config.headers ?? {}; // ヘッダーが無ければ新しく作ります。
    config.headers.Authorization = `Bearer ${token}`; // 「秘密の合言葉（Bearer）」としてトークンを添えます。
  }

  return config; // 設定し終わったリクエスト情報を次に渡します。
});

// ----------------------------------------------------------------------------
// 3. トークン管理の便利関数 (Token Helpers)
// ----------------------------------------------------------------------------

// 保存されているトークンを取得する関数
export const getStoredToken = () => localStorage.getItem(TOKEN_KEY); // トークンを返します。

// トークンを削除する関数 (ログアウト時などに使用)
// tokenToClear が指定されている場合、現在のトークンと一致する場合のみ削除します。
// これにより、ログイン直後に古いリクエストの401エラーでログアウトされるのを防ぎます。
export const clearToken = (tokenToClear?: string) => { 
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (tokenToClear && currentToken !== tokenToClear) {
        console.warn("後続の有効なトークンがあるため、古い401エラーによるログアウトをスキップしました");
        return;
    }
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event("auth:unauthorized"));
}

// トークンを保存する関数 (ログイン成功時に使用)
export const saveToken = (token: string) => // トークンを受け取って、
  localStorage.setItem(TOKEN_KEY, token); // ブラウザに保存します。

// ----------------------------------------------------------------------------
// 4. API関数: 認証関連 (Authentication API)
// ----------------------------------------------------------------------------

/**
 * ユーザー登録 (サインアップ) を行う関数
 */
export const registerUser = async ( // 登録関数を定義。
  email: string, // メールアドレスを受け取ります。
  password: string // パスワードを受け取ります。
): Promise<User> => { // 戻り値はユーザー情報です。
  try { // 失敗に備えて try-catch で囲みます。
    // POSTリクエストで /auth/register にデータを送信
    const res: AxiosResponse<User> = await api.post("/auth/register", { // サーバーに登録情報を送ります。
      email, // メール。
      password, // パスワード。
    }); // サーバーからの返答を待ちます。
    return res.data; // 登録された情報を返します。
  } catch (error) { // 失敗した場合の処理。
    console.error("Error registering user:", error); // ログにエラーを出します。
    throw error; // エラーを呼び出し元に投げ返します。
  }
};

/**
 * ログインを行う関数
 */
export const loginUser = async ( // ログイン関数を定義。
  email: string, // メールアドレスを受け取ります。
  password: string // パスワードを受け取ります。
): Promise<AuthToken> => { // 戻り値は認証トークンです。
  try { // 失敗に備えます。
    // POSTリクエストで /auth/login にデータを送信
    const res: AxiosResponse<AuthToken> = await api.post("/auth/login", { // ログイン情報を送ります。
      email, // メール。
      password, // パスワード。
    }); // サーバーの返答を待ちます。

    // ログインに成功したら、受け取ったアクセストークンをブラウザのローカルストレージに保存する
    saveToken(res.data.access_token); // トークンを保存して次回使えるようにします。
    return res.data; // トークン情報を返します。
  } catch (error) { // 失敗した場合。
    console.error("Error logging in:", error); // エラーをログに記録します。
    throw error; // エラーを返します。
  }
};

/**
 * ユーザーをメールで検索する
 */
export const searchUsers = async (email: string): Promise<User[]> => {
  const res = await api.get("/auth/users", { params: { email } });
  return res.data;
};

export const getMe = async (): Promise<User> => {
  const res = await api.get("/auth/me");
  return res.data;
};

export const getUsers = async (): Promise<User[]> => {
  const res = await api.get("/admin/users");
  return res.data;
};

export const updateUserRole = async (userId: number, role: string): Promise<User> => {
  const res = await api.patch(`/admin/users/${userId}/role`, { role });
  return res.data;
};

export const assignUserToOrganization = async (email: string): Promise<User> => {
    const res = await api.post("/admin/users/assign", { email });
    return res.data;
};

/**
 * 所属組織の情報を取得
 */
export const getMyOrganization = async (): Promise<Organization> => {
  const res = await api.get("/organizations/me");
  return res.data;
};

/**
 * 新しい組織を作成
 */
export const createOrganization = async (data: CreateOrganizationData): Promise<Organization> => {
  const res = await api.post("/organizations/", data);
  return res.data;
};


// ----------------------------------------------------------------------------
// 5. API関数: ToDo関連 (ToDo API)
// ----------------------------------------------------------------------------

/**
 * 自分のToDoリストを全て取得する関数
 */
export const getTodos = async (q?: string): Promise<Todo[]> => { // リスト取得関数。
  try { // 通信失敗に備えます。
    // GETリクエストで /todos/ からデータを取得
    const res: AxiosResponse<Todo[]> = await api.get("/todos/", {
      params: { q }
    }); // ToDo一覧をリクエストします。
    return res.data; // 取得したリストを返します。
  } catch (error) { // エラー発生時。
    const axiosError = error as AxiosError<{ detail?: string | { msg: string }[] }>; // エラーの型を指定。

    // もし「401 Unauthorized (認証エラー)」なら、トークンが無効なので削除する
    if (axiosError.response?.status === 401) {
      // このリクエストで使用したトークンを安全に取り出す
      const authHeader = axiosError.config?.headers?.Authorization;
      const usedToken = typeof authHeader === 'string' ? authHeader.split(" ")[1] : undefined;
      clearToken(usedToken);
    }

    let errorMessage = "ToDoリストの取得に失敗しました"; // 基本のエラーメッセージ。
    if (axiosError.response?.data?.detail) { // サーバーからの詳細エラーがあれば、
      const detail = axiosError.response.data.detail; // 内容を取り出します。
      errorMessage = typeof detail === "string" // 文字列ならそのまま、
        ? detail 
        : (Array.isArray(detail) ? detail[0].msg : JSON.stringify(detail)); // 配列なら最初のメッセージを使います。
    } else if (axiosError.message) { // ネットワークエラーなどの場合。
      errorMessage = axiosError.message; // 通信エラー内容を使います。
    }

    console.error("Error fetching todos:", errorMessage); // ログに記録します。
    // 新しいエラーとして投げ直す (UI側でcatchして表示するため)
    const err = new Error(errorMessage) as Error & { status?: number }; // エラーオブジェクトを作成。
    err.status = axiosError.response?.status; // ステータスコードも添えます。
    throw err; // エラーを投げます。
  }
};

/**
 * 新しいToDoを追加する関数
 * @param data - 作成するTodoのデータ (タイトル、説明)
 * @returns 作成されたTodoデータ
 */
export const createTodo = async (
  data: CreateTodoData & { project_id?: number, status?: string, priority?: string, due_date?: string }
): Promise<Todo> => {
  try {
    const res: AxiosResponse<Todo> = await api.post("/todos/", data);
    return res.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ detail?: string | { msg: string }[] }>;
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
    const err = new Error(errorMessage) as Error & { status?: number };
    err.status = axiosError.response?.status;
    throw err;
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

    if (axiosError.response?.status === 401) {
      const authHeader = axiosError.config?.headers?.Authorization;
      const usedToken = typeof authHeader === 'string' ? authHeader.split(" ")[1] : undefined;
      clearToken(usedToken);
    }

    console.error(`Error updating todo with ID ${id}:`, errorMessage);
    const err = new Error(errorMessage) as Error & { status?: number };
    err.status = axiosError.response?.status;
    throw err;
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

    if (axiosError.response?.status === 401) {
      const authHeader = axiosError.config?.headers?.Authorization;
      const usedToken = typeof authHeader === 'string' ? authHeader.split(" ")[1] : undefined;
      clearToken(usedToken);
    }

    console.error(`Error deleting todo with ID ${id}:`, errorMessage);
    const err = new Error(errorMessage) as Error & { status?: number };
    err.status = axiosError.response?.status;
    throw err;
  }
};

// ----------------------------------------------------------------------------
// 6. API関数: プロジェクト関連 (Project API)
// ----------------------------------------------------------------------------

export const getProjects = async (): Promise<Project[]> => {
  try {
    const res: AxiosResponse<Project[]> = await api.get("/projects/");
    return res.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response?.status === 401) {
      const authHeader = axiosError.config?.headers?.Authorization;
      const usedToken = typeof authHeader === 'string' ? authHeader.split(" ")[1] : undefined;
      clearToken(usedToken);
    }
    throw error;
  }
};

export const getProjectSummaries = async (): Promise<ProjectSummary[]> => {
  try {
    const res: AxiosResponse<ProjectSummary[]> = await api.get("/projects/summary");
    return res.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response?.status === 401) {
      const authHeader = axiosError.config?.headers?.Authorization;
      const usedToken = typeof authHeader === 'string' ? authHeader.split(" ")[1] : undefined;
      clearToken(usedToken);
    }
    throw error;
  }
};

export const createProject = async (data: CreateProjectData): Promise<Project> => {
  const res: AxiosResponse<Project> = await api.post("/projects/", data);
  return res.data;
};

export const updateProject = async (id: number, data: UpdateProjectData): Promise<Project> => {
  const res: AxiosResponse<Project> = await api.patch(`/projects/${id}`, data);
  return res.data;
};

export const deleteProject = async (id: number): Promise<void> => {
  await api.delete(`/projects/${id}`);
};

export const addCollaborator = async (projectId: number, userId: number, permission: string = "editor"): Promise<Collaborator> => {
  const res = await api.post(`/projects/${projectId}/collaborators`, { user_id: userId, permission });
  return res.data;
};

export const removeCollaborator = async (projectId: number, userId: number): Promise<void> => {
  await api.delete(`/projects/${projectId}/collaborators/${userId}`);
};

// ----------------------------------------------------------------------------
// 7. API関数: その他の機能 (Other Features)
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

/**
 * 監査ログの一覧を取得する関数
 */
export const getAuditLogs = async (skip: number = 0, limit: number = 100): Promise<AuditLog[]> => {
    const res: AxiosResponse<AuditLog[]> = await api.get("/admin/audit-logs", {
        params: { skip, limit }
    });
    return res.data;
};

/**
 * システムの健康状態を取得する
 */
export const getHealth = async (): Promise<HealthStatus> => {
    const res = await api.get("/monitor/health");
    return res.data;
};

/**
 * システム統計を取得する
 */
export const getSystemStats = async (): Promise<SystemStats> => {
    const res = await api.get("/monitor/stats");
    return res.data;
};
