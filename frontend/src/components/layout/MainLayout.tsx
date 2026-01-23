import type { ReactNode } from "react";

/**
 * MainLayoutProps: MainLayoutコンポーネントが受け取る情報の定義
 * @param sidebar 左側に表示するコンポーネント
 * @param searchBar 上部に表示する検索用コンポーネント
 * @param children 画面中央に表示されるメインコンテンツ（各View）
 */
interface MainLayoutProps {
  sidebar: ReactNode;
  searchBar: ReactNode;
  children: ReactNode;
}

/**
 * アプリケーションの基本骨格を定義するレイアウトコンポーネント。
 */
export default function MainLayout({ sidebar, searchBar, children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex p-4 gap-6">
      {sidebar}
      <main className="flex-1 max-w-5xl mx-auto w-full">
        {searchBar}
        {children}
      </main>
    </div>
  );
}
