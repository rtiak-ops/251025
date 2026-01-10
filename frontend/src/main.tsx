import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css"; // グローバルなスタイルシートの読み込み
import App from "./App.tsx"; // メインのAppコンポーネント

// === React Query (TanStack Query) の設定 ===
// アプリケーション全体でサーバー状態（APIからのデータなど）を管理するためのクライアントを作成します。
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ウィンドウにフォーカスが戻ったときにデータを自動的に再取得するかどうか
      // falseにすると、無駄な通信を減らせますが、データのリアルタイム性は下がります。
      refetchOnWindowFocus: false,
      // データ取得に失敗した場合の再試行回数 (ここでは1回だけリトライ)
      retry: 1,
    },
  },
});

import React from "react";

/**
 * 簡易的なエラー境界コンポーネント
 * アプリケーション内で予期せぬエラーが発生した際に、画面が真っ白になるのを防ぎます。
 */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-md w-full glass p-8 rounded-3xl text-center space-y-4">
            <div className="text-4xl text-red-500">⚠️</div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">予期せぬエラーが発生しました</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              アプリケーションの読み込み中にエラーが発生しました。ブラウザのキャッシュをクリアして再試行してください。
            </p>
            <pre className="text-[10px] bg-red-50 dark:bg-red-900/20 p-4 rounded-xl overflow-auto text-red-600 dark:text-red-400 text-left">
              {this.state.error?.message}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="w-full btn-primary"
            >
              再読み込み
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>
);
