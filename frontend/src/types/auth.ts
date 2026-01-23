/**
 * ユーザー情報を表すインターフェース
 */
export interface User {
  id: number;           // ユーザーを一意に識別するID
  email: string;        // ユーザーのメールアドレス (ログインIDとしても利用)
  full_name?: string;   // ユーザーの氏名
  created_at: string;   // アカウントが作成された日時
  role: 'admin' | 'user'; // システム上の権限 (admin: 管理者, user: 一般ユーザー)
  organization_id?: number | null; // 所属している組織のID (未所属の場合はnull)
}

/**
 * 組織情報の構造を定義するインターフェース
 */
export interface Organization {
  id: number;           // 組織ID
  name: string;         // 組織名
  corporate_id: string | null; // 法人番号など (任意)
  website: string | null;      // 組織のウェブサイトURL (任意)
  is_verified: boolean;        // 確認済み組織かどうかのフラグ
  plan: 'free' | 'pro' | 'enterprise'; // 契約プラン
  created_at: string;   // 登録日時
}

/**
 * 新しい組織を登録する際に必要なデータ
 */
export interface CreateOrganizationData {
  name: string;          // 組織名 (必須)
  corporate_id?: string; // 法人番号 (任意)
  website?: string;      // ウェブサイト (任意)
}

/**
 * 認証トークンの型定義
 * ログイン成功時にサーバーから受け取るトークンの情報です。
 */
export interface AuthToken {
  access_token: string; // アクセストークン本体 (APIリクエストのヘッダーに付けて送る)
  token_type: string;   // トークンの種類 (通常は "bearer")
}
