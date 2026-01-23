import { useState } from "react";
import { login, register, getStoredToken } from "../../api";
import { toast } from "react-hot-toast";
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, Loader2 } from "lucide-react";

interface AuthFormProps {
  onAuthenticated: (token: string) => void;
}

/**
 * ログイン・新規登録を切り替えて表示するフォームコンポーネント。
 */
export default function AuthForm({ onAuthenticated }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // フォームの入力項目
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        // ログイン処理
        await login(email, password);
        const token = getStoredToken();
        if (token) {
          onAuthenticated(token);
          toast.success("おかえりなさい！");
        }
      } else {
        // 新規登録処理
        await register(email, password, fullName);
        toast.success("アカウントを作成しました。ログインしてください。");
        setIsLogin(true); // 登録後はログイン画面へ
      }
    } catch (err: any) {
        const errorMsg = err.response?.data?.detail || "認証に失敗しました";
        toast.error(errorMsg);
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
            type="password" 
            placeholder="パスワード..." 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium dark:text-white"
            required
          />
        </div>

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
