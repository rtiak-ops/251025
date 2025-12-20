// ==========================================
// 1. 必要なライブラリと自作関数のインポート
// ==========================================
import { useState } from "react";
// backend/app/routers/auth.py と通信するためのAPI関数
import { loginUser, registerUser } from "../api";

/**
 * 【Props定義】
 * 親コンポーネント(App.tsxなど)から受け取るデータの型を定義します。
 */
interface Props {
  // 認証成功時に実行する関数。引数としてJWT(アクセストークン)を受け取ります。
  onAuthenticated: (token: string) => void;
}

/**
 * 【認証フォームコンポーネント】
 * ログイン画面と新規登録画面の2つの役割を持つフォームです。
 * ユーザーはボタンひとつでモードを切り替えられます。
 */
export default function AuthForm({ onAuthenticated }: Props) {
  // --- 状態管理 (State) ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login"); // ログイン or 新規登録
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * フォーム送信ハンドラ
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 1. 新規登録モードの場合はまずユーザー作成
      if (mode === "register") {
        await registerUser(email, password);
      }

      // 2. ログイン処理（登録直後も同様にログイン）
      const token = await loginUser(email, password);
      
      // 3. 親コンポーネントにトークンを渡してログイン状態へ
      onAuthenticated(token.access_token);
      
    } catch (err: any) {
      console.error("認証エラー:", err);
      let displayMessage = "認証に失敗しました。";

      // Pydanticバリデーションエラーやカスタムエラーの詳細を取得
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        displayMessage = Array.isArray(detail) 
          ? detail.map((d: any) => d.msg).join(", ") 
          : detail;
      }
      setError(displayMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
          {mode === "login" ? "おかえりなさい！" : "アカウント作成"}
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          {mode === "login" ? "詳細を入力してログインしてください" : "登録してタスク管理を始めましょう"}
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          {/* メールアドレス入力 */}
          <div className="relative group">
            <input
              type="email"
              className="w-full bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
          </div>

          {/* パスワード入力 */}
          <div className="relative group">
            <input
              type="password"
              className="w-full bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
          </div>
        </div>

        {/* エラーエリア */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        
        {/* 送信ボタン */}
        <button
          type="submit"
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 disabled:bg-slate-300 dark:disabled:bg-slate-700"
          disabled={isLoading}
        >
          {isLoading
            ? "認証中..."
            : mode === "login"
            ? "サインイン"
            : "アカウント作成"}
        </button>

        {/* モード切替リンク */}
        <button
          type="button"
          className="w-full text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-colors"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
        >
          {mode === "login" ? (
            <>アカウントをお持ちでないですか？ <span className="text-indigo-600 dark:text-indigo-400">新規登録</span></>
          ) : (
            <>既にアカウントをお持ちですか？ <span className="text-indigo-600 dark:text-indigo-400">ログイン</span></>
          )}
        </button>
      </form>
    </div>
  );
}

