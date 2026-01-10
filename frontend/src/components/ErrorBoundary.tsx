import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary.tsx
 * アプリケーション内で予期せぬエラーが発生した際に、
 * 画面が真っ白になるのを防ぎ、ユーザーに分かりやすいメッセージと
 * 復旧手段を提供するためのコンポーネントです。
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // 次のレンダリングでフォールバックUIを表示します
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    // ページをリロードして復旧を試みる
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
          <div className="glass p-8 rounded-3xl max-w-md w-full text-center space-y-6 animate-in zoom-in duration-300">
            <div className="inline-flex p-4 rounded-2xl bg-red-500/10 text-red-500">
              <AlertTriangle size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                問題が発生しました
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                アプリケーションの実行中に予期せぬエラーが発生しました。
                {this.state.error?.message && (
                  <span className="block mt-2 text-xs font-mono bg-slate-100 dark:bg-slate-800 p-2 rounded">
                    {this.state.error.message}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-lg shadow-indigo-500/30"
            >
              <RefreshCw size={20} />
              アプリを再読み込み
            </button>
          </div>
        </div>
      );
    }

    return this.children;
  }
}

export default ErrorBoundary;
