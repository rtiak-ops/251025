import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Reactのレンダリングエラーをキャッチし、画面真っ白になるのを防ぐためのコンポーネント。
 */
export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-md w-full glass p-10 rounded-[2.5rem] border-red-100 dark:border-red-900/30 text-center animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <AlertCircle size={48} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-4">エラーが発生しました</h2>
            <p className="text-slate-500 dark:text-white/60 mb-10 font-medium">
              予期せぬエラーが発生し、画面を表示できません。ページを更新してください。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-200 dark:shadow-none transition-all flex items-center justify-center gap-3"
            >
              <RefreshCcw size={20} />
              ページを再読み込み
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
