import { useState } from "react";
import { loginUser, registerUser } from "../api";

/**
 * 認証フォームコンポーネントのProps
 */
interface Props {
  // 認証が成功した時に呼び出されるコールバック関数
  onAuthenticated: (token: string) => void;
}

/**
 * ログインと新規登録を切り替えられる認証フォームコンポーネント
 */
export default function AuthForm({ onAuthenticated }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * フォーム送信時の処理
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    setError(null);

    try {
      if (mode === "register") {
        await registerUser(email, password);
      }

      const token = await loginUser(email, password);
      onAuthenticated(token.access_token);
      
    } catch (err: any) { // 👈 修正箇所はこのブロック
      console.error("認証リクエスト失敗:", err); // ★コンソールで詳細を確認可能

      let displayMessage = "認証に失敗しました。メールとパスワードを確認してください。";

      // 1. サーバーからのレスポンスがあるかチェック (errがAxiosErrorの場合)
      if (err.response) {
        const data = err.response.data;

        // 2. 422 Unprocessable Entity の場合 (Pydanticバリデーションエラー)
        if (err.response.status === 422 && data && Array.isArray(data.detail)) {
          // Pydanticエラーの配列 (data.detail) を処理
          displayMessage = data.detail
            .map((d: any) => {
              const field = d.loc[d.loc.length - 1]; // エラーが発生したフィールド名
              return `${field}: ${d.msg}`;
            })
            .join(' | ');

        // 3. 400 Bad Request, 401 Unauthorized などの場合 (カスタムエラー)
        } else if (data && data.detail) {
          // detailが文字列または、安全に文字列化できるデータの場合
          displayMessage = (typeof data.detail === 'string') 
                         ? data.detail 
                         : `サーバーからの応答: ${err.response.status}`;
        }
      } 
      // 4. Axiosやネットワークエラーの場合
      else if (err.message) {
        displayMessage = err.message;
      }
      
      // 5. 最終チェック: displayMessageがオブジェクトでないことを確認 (念のため)
      if (typeof displayMessage === 'object' && displayMessage !== null) {
          displayMessage = "入力データまたは通信エラーです。";
      }

      setError(displayMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border rounded p-4 bg-white dark:bg-gray-800 dark:border-gray-700">
      <h2 className="text-lg font-semibold mb-2 text-center">
        {mode === "login" ? "ログイン" : "新規登録"}
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          className="border rounded p-2 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          className="border rounded p-2 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {/* エラーメッセージの表示箇所 */}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white rounded py-2 disabled:bg-gray-400 disabled:text-gray-200 dark:bg-blue-600 dark:hover:bg-blue-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
          disabled={isLoading}
        >
          {isLoading
            ? "処理中..."
            : mode === "login"
            ? "ログイン"
            : "登録してログイン"}
        </button>
        <button
          type="button"
          className="text-sm text-blue-600 underline dark:text-blue-300"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "新規登録はこちら" : "ログインに切り替え"}
        </button>
      </form>
    </div>
  );
}