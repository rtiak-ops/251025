import { useState } from "react";
import { loginUser, registerUser } from "../api";

/**
 * 認証フォームコンポーネントのProps
 */
interface Props {
  // 認証が成功した時に呼び出されるコールバック関数
  // 取得したアクセストークンを親コンポーネントに渡す
  onAuthenticated: (token: string) => void;
}

/**
 * ログインと新規登録を切り替えられる認証フォームコンポーネント
 *
 * - ログインモード: 既存ユーザーのログイン
 * - 登録モード: 新規ユーザーの登録とログイン（登録後、自動的にログインも実行される）
 */
export default function AuthForm({ onAuthenticated }: Props) {
  // フォームの入力値を管理する状態
  const [email, setEmail] = useState(""); // メールアドレスの入力値
  const [password, setPassword] = useState(""); // パスワードの入力値

  // フォームのモード（"login" = ログイン, "register" = 新規登録）
  const [mode, setMode] = useState<"login" | "register">("login");

  // APIリクエストのローディング状態
  const [isLoading, setIsLoading] = useState(false);

  // エラーメッセージ（認証に失敗した場合など）
  const [error, setError] = useState<string | null>(null);

  /**
   * フォーム送信時の処理
   *
   * ログインモードの場合はログインのみ実行、
   * 登録モードの場合は登録を実行してから自動的にログインを実行します。
   */
  const handleSubmit = async (e: React.FormEvent) => {
    // フォームのデフォルトの送信動作（ページリロード）を防止
    e.preventDefault();

    // ローディング状態を開始、エラーメッセージをクリア
    setIsLoading(true);
    setError(null);

    try {
      // 登録モードの場合、まず新規ユーザーを登録
      if (mode === "register") {
        await registerUser(email, password);
        // 登録が成功したら、自動的にログインを実行する
      }

      // ログインを実行（登録モードの場合は登録後に実行、ログインモードの場合は最初に実行）
      const token = await loginUser(email, password);

      // 認証成功: 親コンポーネントにトークンを渡す
      // これにより、アプリケーション全体が認証済み状態になる
      onAuthenticated(token.access_token);
    } catch (err) {
      // エラーが発生した場合（登録失敗、ログイン失敗、ネットワークエラーなど）
      console.error(err);

      // エラーメッセージを取得
      // Errorインスタンスの場合はそのメッセージを、それ以外の場合はデフォルトメッセージを使用
      const errorMessage =
        err instanceof Error
          ? err.message
          : "認証に失敗しました。メールとパスワードを確認してください。";

      // エラーメッセージを状態に設定（UIに表示される）
      setError(errorMessage);
    } finally {
      // 成功・失敗に関わらず、ローディング状態を終了
      setIsLoading(false);
    }
  };

  return (
    <div className="border rounded p-4">
      <h2 className="text-lg font-semibold mb-2 text-center">
        {mode === "login" ? "ログイン" : "新規登録"}
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          className="border rounded p-2"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          className="border rounded p-2"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white rounded py-2 disabled:bg-gray-400"
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
          className="text-sm text-blue-600 underline"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "新規登録はこちら" : "ログインに切り替え"}
        </button>
      </form>
    </div>
  );
}
