import { useState } from "react";
import { loginUser, registerUser } from "../api";

interface Props {
  onAuthenticated: (token: string) => void;
}

export default function AuthForm({ onAuthenticated }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      console.error(err);
      setError("認証に失敗しました。メールとパスワードを確認してください。");
    } finally {
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
