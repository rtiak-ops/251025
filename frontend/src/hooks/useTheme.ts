import { useEffect, useState } from "react";

/**
 * 【テーマ管理フック (useTheme)】
 * アプリケーションの「ライトモード」「ダークモード」を管理します。
 * OSの設定値や保存されたユーザー設定を反映し、モード切替時にHTMLクラスを変更します。
 */
export function useTheme() {
  // --- 初期のテーマ状態を決定 ---
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    // 1. ローカルストレージに設定があればそれを優先
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;

    // 2. なければブラウザ/OSのシステム設定（prefers-color-scheme）を参照
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  /**
   * テーマが変更された際の反映処理
   * HTML要素に対して "dark" クラスを付け外しすることで、CSS変数を切り替えます（Tailwind等の対応）。
   */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme); // 設定値を保存
  }, [theme]);

  // モードを反転させる簡易関数
  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");

  return { theme, setTheme, toggleTheme };
}
