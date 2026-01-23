/**
 * 監査ログの構造を定義するインターフェース
 */
export interface AuditLog {
  id: number;                  // ログID
  user_id?: number | null;     // 操作を行ったユーザーのID
  user_email?: string | null;  // 操作を行ったユーザーのメールアドレス
  action: string;              // 行われたアクション (例: "Login", "Create Todo")
  resource_type: string;       // 対象リソースの種類 (例: "User", "Todo")
  resource_id?: number | null; // 対象リソースのID
  details?: string | null;     // 操作の詳細内容
  created_at: string;          // 操作が行われた日時
}

/**
 * サービス全体の統計情報
 */
export interface SystemStats {
  counts: {
    users: number;       // 総ユーザー数
    projects: number;    // 総プロジェクト数
    tasks: number;       // 総タスク数
    audit_logs: number;  // 総監査ログ数
  };
}

/**
 * サーバーのヘルスチェック（稼働状況）レスポンス
 */
export interface HealthStatus {
  status: string;        // サービス全体のステータス (例: "healthy")
  timestamp: number;     // チェック時のタイムスタンプ
  database: {
    status: string;      // データベースの接続状況
    latency_sec: number; // データベースアクセスのレイテンシ（秒）
  };
  environment: string;   // 動作環境 (例: "production", "development")
  version: string;       // アプリケーションのバージョン
}
