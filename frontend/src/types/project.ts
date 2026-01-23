/**
 * プロジェクトの共同作業者情報を定義するインターフェース
 */
export interface Collaborator {
  id: number;           // 共同作業レコードのID
  user_id: number;      // ユーザーID
  user_email?: string;  // ユーザーのメールアドレス
  permission: 'viewer' | 'editor'; // 権限 (viewer: 閲覧のみ, editor: 編集可能)
}

/**
 * プロジェクトの情報を定義するインターフェース
 */
export interface Project {
  id: number;           // プロジェクトID
  name: string;         // プロジェクト名
  description?: string; // プロジェクトの説明 (任意)
  created_at: string;   // 作成日時
  updated_at: string;   // 最終更新日時
  owner_id: number;     // プロジェクト所有者のユーザーID
  collaborators?: Collaborator[]; // 共同作業者のリスト
}

/**
 * ダッシュボードなどで表示するためのプロジェクト概要
 * Projectインターフェースを拡張し、統計情報を追加しています。
 */
export interface ProjectSummary extends Project {
  todo_count: number;      // プロジェクト内の総タスク数
  completed_count: number; // 完了済みのタスク数
  role?: 'owner' | 'collaborator'; // 現在のユーザーのプロジェクトにおける役割
}

/**
 * プロジェクトを新規作成する際に必要なデータ
 */
export interface CreateProjectData {
  name: string;         // プロジェクト名 (必須)
  description?: string; // 説明 (任意)
}

/**
 * プロジェクト情報を更新する際に使うデータ
 * CreateProjectDataの全項目をオプションにしたものです。
 */
export type UpdateProjectData = Partial<CreateProjectData>;
