import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

/**
 * Reactアプリケーションのエントリーポイント
 *
 * このファイルは、HTMLの#root要素にReactアプリケーションをマウントします。
 * StrictModeは開発時に潜在的な問題を検出するためのReactの開発モード機能です。
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
