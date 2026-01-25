import { useState } from "react";
import { login, register, getStoredToken } from "../../api";
import { AxiosError } from "axios";
import { toast } from "react-hot-toast";
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, Loader2 } from "lucide-react";

interface AuthFormProps {
  onAuthenticated: (token: string) => void;
}

/**
 * 【認証フォーム (AuthForm)】
 * ユーザーのログインと新規登録を担うコンポーネントです。
 * タブ切り替えによって単一の画面で両方の機能を提供し、認証成功時に親コンポーネントへトークンを渡します。
 */
export default function AuthForm({ onAuthenticated }: AuthFormProps) {
  // 現在のモード（ログイン or 新規登録）の状態管理
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // フォームの入力項目
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * フォーム送信時の処理
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (isLogin) {
        // --- ログイン処理 ---
        // メールアドレスとパスワードをバックエンドへ送信
        await login(email, password);
        const token = getStoredToken();
        if (token) {
          // 認証成功通知を親(App.tsx)へ飛ばす
          onAuthenticated(token);
          toast.success("おかえりなさい！");
        }
      } else {
        // --- 新規登録処理 ---
        // 氏名を含めたアカウント情報を登録
        await register(email, password, fullName);
        toast.success("アカウントを作成しました。ログインしてください。");
        // 登録完了後はユーザーの利便性のためにログイン画面に自動切替
        setIsLogin(true);
      }
    } catch (err) {
        // APIエラーハンドリング（バリデーションエラー等の詳細取得）
        type FastAPIErrorDetail = string | { msg: string; [key: string]: unknown }[] | { msg: string; [key: string]: unknown };
        const axiosError = err as AxiosError<{ detail?: FastAPIErrorDetail }>;
        let msg = "認証に失敗しました";
        
        if (axiosError.response?.data?.detail) {
          const detail = axiosError.response.data.detail;
          // FastAPIが返す詳細なエラーメッセージをフロントエンド用に成形
          if (typeof detail === "string") {
            msg = detail;
          } else if (Array.isArray(detail)) {
            msg = detail.map(d => {
              const rawMsg = typeof d === 'string' ? d : (d.msg || JSON.stringify(d));
              return rawMsg.replace(/^Value error, /, "");
            }).join(", ");
          } else if (typeof detail === "object" && detail.msg) {
            msg = detail.msg.replace(/^Value error, /, "");
          }
        } else if (axiosError.request) {
          msg = "サーバーと通信できません。インターネット接続を確認してください。";
        } else if (axiosError.message) {
          msg = axiosError.message;
        }

        setErrorMessage(msg);
        toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* タブ切り替えボタン */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
        <button 
          onClick={() => setIsLogin(true)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all text-sm font-bold ${
            isLogin ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <LogIn size={18} />
          ログイン
        </button>
        <button 
          onClick={() => setIsLogin(false)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all text-sm font-bold ${
            !isLogin ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <UserPlus size={18} />
          新規登録
        </button>
      </div>

      {/* 認証フォーム本体 */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div className="relative">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              id="full_name"
              name="full_name"
              type="text" 
              placeholder="氏名を入力..." 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium dark:text-white"
              required
            />
          </div>
        )}

        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            id="email"
            name="email"
            type="email" 
            placeholder="メールアドレス..." 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium dark:text-white"
            required
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            id="password"
            name="password"
            type="password" 
            placeholder="パスワード..." 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium dark:text-white"
            required
          />
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/50 rounded-2xl text-red-600 dark:text-red-400 text-sm font-medium animate-in fade-in slide-in-from-top-2">
            {errorMessage}
          </div>
        )}

        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-3 disabled:opacity-70"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            isLogin ? <LogIn size={20} /> : <UserPlus size={20} />
          )}
          {isLogin ? "ログインする" : "登録を完了する"}
        </button>
      </form>
    </div>
  );
}
