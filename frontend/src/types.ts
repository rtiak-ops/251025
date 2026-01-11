// ==========================================
// 型定義ファイル (Type Definitions)
// ==========================================
// アプリケーション全体で使用するデータの「形」をここで定義します。
// これにより、間違ったデータを渡してしまうミスを防ぐことができます。

// ----------------------------------------------------------------------------
// 1. Todoアイテム関連の型定義
// ----------------------------------------------------------------------------

/**
 * Todoアイテムの構造を定義するインターフェース
 * サーバーから受け取るTodoデータの形です。
 */
export interface Todo {
  id: number;           // Todoを一意に識別するためのID (必須)
  title: string;        // Todoのタイトル (必須)
  description?: string; // Todoの詳細な説明 (オプション: ?がついているので無くてもOK)
  completed: boolean;   // Todoが完了しているかどうかを示すフラグ (true: 完了, false: 未完了)
  created_at: string;   // 作成日時 (ISO 8601形式の文字列例: "2023-01-01T12:00:00Z")
  updated_at: string;   // 更新日時
  owner_id?: number;    // 作成者のユーザーID (オプション)
  order: number;        // 並び順
  project_id?: number;  // 紐づくプロジェクトID
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'; // ステータス
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'; // 優先度
  due_date?: string;    // 期限
}

/**
 * 新しいTo-Doを作成するときにサーバーに送るデータの形
 * IDや作成日時はサーバー側で決めるので、ここには含めません。
 */
export interface CreateTodoData {
  title: string;        // タイトルは必須
  description?: string; // 説明は任意
}

/**
 * To-Doを更新するときに使うデータの形
 * 
 * UpdateTodoData = Partial<Omit<Todo, "id">>;
 * の意味:
 * 1. Omit<Todo, "id"> ... Todo型から "id" を除外します (IDは変更できないため)
 * 2. Partial<...>     ... 残りの項目をすべて「オプション(任意)」にします
 * 
 * つまり、「タイトルだけ変えたい」「完了状態だけ変えたい」といった使い方ができます。
 */
export type UpdateTodoData = Partial<Omit<Todo, "id">>;

// ----------------------------------------------------------------------------
// 2. ユーザー・認証関連の型定義
// ----------------------------------------------------------------------------

/**
 * ユーザー情報の構造を定義するインターフェース
 * ログインしているユーザーの情報を扱うときに使います。
 */
export interface User {
  id: number;           // ユーザーID
  email: string;        // メールアドレス (ログインIDとして使用)
  created_at: string;   // アカウント作成日時
  role: 'admin' | 'user'; // 役割
}

/**
 * 認証トークンの型定義
 * ログイン成功時にサーバーから受け取るトークンの情報です。
 */
export interface AuthToken {
  access_token: string; // アクセストークン本体 (APIリクエストのヘッダーに付けて送る)
  token_type: string;   // トークンの種類 (通常は "bearer")
}

// ----------------------------------------------------------------------------
// 3. プロジェクト関連の型定義
// ----------------------------------------------------------------------------

export interface Project {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  owner_id: number;
}

export interface Collaborator {
  id: number;
  user_id: number;
  user_email?: string;
  permission: 'viewer' | 'editor';
}

export interface ProjectSummary extends Project {
  todo_count: number;
  completed_count: number;
  role?: 'owner' | 'collaborator';
  collaborators?: Collaborator[];
}

export interface CreateProjectData {
  name: string;
  description?: string;
}

export type UpdateProjectData = Partial<CreateProjectData>;
