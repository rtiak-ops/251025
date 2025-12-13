import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";

// QueryClientのインスタンスを作成
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ウィンドウフォーカス直後の自動再取得（リフェッチ）を無効にするかどうか
      // UXによって変更するが、今回はToo Muchな通信を避けるためfalseにする例
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * Reactアプリケーションのエントリーポイント
 *
 * QueryClientProviderでアプリ全体を囲むことで、
 * アプリ内のどこからでもuseQueryなどが使えるようになる。
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
