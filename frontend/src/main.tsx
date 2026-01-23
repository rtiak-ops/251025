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

import ErrorBoundary from "./components/views/ErrorBoundary.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>
);
