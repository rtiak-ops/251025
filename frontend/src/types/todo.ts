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
 */
export type UpdateTodoData = Partial<Omit<Todo, "id">>;
