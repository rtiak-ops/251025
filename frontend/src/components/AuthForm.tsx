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
  
  // 入力されたメールアドレスを保持
  const [email, setEmail] = useState("");
  
  // 入力されたパスワードを保持
  const [password, setPassword] = useState("");
  
  // 現在のモード: "login"(ログイン) か "register"(新規登録) か
  const [mode, setMode] = useState<"login" | "register">("login");
  
  // 通信中かどうか（ボタンを無効化したり、ローディング表示に使う）
  const [isLoading, setIsLoading] = useState(false);
  
  // エラーメッセージ（ログイン失敗時などに表示）
  const [error, setError] = useState<string | null>(null);

  /**
   * フォーム送信時の処理
   */
  /**
   * 【フォーム送信ハンドラ】
   * ユーザーが「ログイン」または「登録」ボタンを押した時に実行されます。
   */
  const handleSubmit = async (e: React.FormEvent) => {
    // フォームのデフォルト動作（ページリロード）をキャンセル
    e.preventDefault();

    // ローディング状態を開始し、以前のエラーをクリア
    setIsLoading(true);
    setError(null);

    try {
      // --- 1. 新規登録モードの場合 ---
      if (mode === "register") {
        // バックエンドの /register エンドポイントを呼び出す
        // 成功すればDBにユーザーが作られる
        await registerUser(email, password);
      }

      // --- 2. ログイン処理 (登録時も直後にログインする仕様) ---
      // バックエンドの /token エンドポイントを呼び出してトークンを取得
      const token = await loginUser(email, password);
      
      // --- 3. 親コンポーネントに成功を通知 ---
      // 取得したアクセストークンを渡して、アプリ全体を「ログイン状態」にする
      onAuthenticated(token.access_token);
      
    } catch (err: any) {
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
              const fieldName = (field === 'email' ? 'メールアドレス' : field === 'password' ? 'パスワード' : field);
              
              // エラーメッセージの翻訳・整形
              let message = d.msg;
              if (message.includes("value is not a valid email address")) {
                message = "有効なメールアドレスの形式ではありません";
              } else if (message === "Field required") {
                message = "入力してください";
              } else if (message.startsWith("Value error, ")) {
                message = message.replace("Value error, ", "");
              }

              return `${fieldName}: ${message}`;
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
    // 外枠のデザイン: 角丸、枠線、パディング、ダークモード対応
    <div className="border rounded p-4 bg-white dark:bg-gray-800 dark:border-gray-700">
      {/* タイトル: モードによって「ログイン」か「新規登録」か切り替わる */}
      <h2 className="text-lg font-semibold mb-2 text-center">
        {mode === "login" ? "ログイン" : "新規登録"}
      </h2>
      
      {/* 入力フォームエリア */}
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
        {/* エラーメッセージがあればここに赤字で表示 */}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        
        {/* 送信ボタン */}
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white rounded py-2 disabled:bg-gray-400 disabled:text-gray-200 dark:bg-blue-600 dark:hover:bg-blue-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
          // 通信中(isLoading=true)のときはボタンを押せないようにする（連打防止）
          disabled={isLoading}
        >
          {isLoading
            ? "処理中..." // 通信中の表示
            : mode === "login"
            ? "ログイン"
            : "登録してログイン"}
        </button>

        {/* モード切替ボタン (テキストリンク風) */}
        <button
          type="button"
          className="text-sm text-blue-600 underline dark:text-blue-300"
          // クリックすると login <-> register が反転する
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "新規登録はこちら" : "ログインに切り替え"}
        </button>
      </form>
    </div>
  );
}