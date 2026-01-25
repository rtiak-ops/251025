import axios from "axios";
import { toast } from "react-hot-toast";

/**
 * 【APIクライアント設定】
 * Axios をベースにしたシステム全体の通信クライアントです。
 * ベースURL、共通の認証ヘッダー、およびエラー（401認証切れ等）の集中管理を行います。
 */

// サーバーのAPIエンドポイント（Viteの環境変数または空をベースに設定）
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
// ブラウザのLocalStorageに保存するトークンのキー名
const TOKEN_KEY = "auth_token";

// API通信専用のAxiosインスタンス
export const api = axios.create({ baseURL: API_BASE });

// --- リクエスト・インターセプター ---
// 全ての送信リクエストの直前に割り込み、保存されているトークンをヘッダーに自動的に付与します。
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    // Bearer認証形式でヘッダーをセット
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- トークン管理ヘルパー機能 ---

// 現在保存されているトークンを取得
export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);

// トークンの破棄と、アプリケーション全体への「未ログイン」通知の配信
export const clearToken = (tokenToClear?: string) => { 
    const currentToken = localStorage.getItem(TOKEN_KEY);
    // 特定の古いトークンのみを破棄したい場合のチェック
    if (tokenToClear && currentToken !== tokenToClear) return;
    
    localStorage.removeItem(TOKEN_KEY);
    // ログアウトしたことをグローバルなイベントで通知（useAuth hook等が受信）
    window.dispatchEvent(new Event("auth:unauthorized"));
}

// 新しいトークンをLocalStorageに保存
export const saveToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);

// --- レスポンス・インターセプター ---
// サーバーからの返答が返ってきた直後に、共通のエラー処理を実行します。
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 Unauthorized (認証エラー) が発生した場合
    if (error.response?.status === 401) {
      // ログインページ以外で、かつ以前はログインしていた場合に、セッション切れメッセージを表示
      // ログイン試行自体での401（パスワード間違い）はここでは処理しません
      if (!window.location.pathname.includes("/auth") && getStoredToken()) {
        clearToken();
        toast.error("セッションの有効期限が切れました。再度ログインしてください。");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
