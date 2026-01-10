import { useEffect, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type DropResult } from "@hello-pangea/dnd";
import { getTodos, getStoredToken, clearToken, reorderTodos, getProjectSummaries } from "./api";
import type { Todo, ProjectSummary } from "./types";
import Sidebar from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import ProjectTasksView from "./components/ProjectTasksView";
import AuthForm from "./components/AuthForm";

/**
 * App.tsx
 * アプリケーションのメインエントリーポイント。
 * 全体のレイアウト、ルーティング（ビューの切り替え）、共有データの取得を管理します。
 */
export default function App() {
  const queryClient = useQueryClient();
  
  // --- 状態管理 (State) ---
  const [token, setToken] = useState<string | null>(getStoredToken());
  // 現在表示しているビュー（ダッシュボード、全タスク、または特定のプロジェクトID）
  const [currentView, setCurrentView] = useState<'dashboard' | 'all' | number>('dashboard');
  
  // テーマ（ライト/ダークモード）
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("theme");
    return stored === "light" || stored === "dark" 
      ? stored 
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  // --- データ取得 (React Query) ---

  // プロジェクト一覧と進捗サマリーを取得
  const { data: projects = [] } = useQuery<ProjectSummary[]>({
    queryKey: ["projects"],
    queryFn: getProjectSummaries,
    enabled: !!token, // ログイン時のみ実行
  });

  // すべてのタスクを取得
  const { 
    data: allTodos = [], 
    isLoading: isTodosLoading
  } = useQuery<Todo[]>({
    queryKey: ["todos"],
    queryFn: getTodos,
    enabled: !!token,
  });

  // --- 副作用 (Side Effects) ---

  // 認証エラー（401）を検知してログアウト処理を行う
  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      queryClient.clear();
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [queryClient]);

  // テーマの変更をDOMとlocalStorageに反映
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // タスクの並び替え更新用
  const reorderMutation = useMutation({
    mutationFn: (newOrderIds: number[]) => reorderTodos(newOrderIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
    onError: () => {
      toast.error("並び替えに失敗しました");
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    }
  });

  // --- ハンドラー (Handlers) ---

  const handleLogout = () => {
    clearToken();
    setToken(null);
    queryClient.clear();
    toast.success("ログアウトしました");
  };

  /** 
   * データが変更された際にキャッシュを無効化して再取得を促す
   */
  const handleDataChange = () => {
    queryClient.invalidateQueries({ queryKey: ["todos"] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  };

  /**
   * ドラッグ&ドロップ終了時の処理
   */
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    // 現在の表示リスト内で並び替え
    const items = Array.from(filteredTodos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    try {
        const newOrderIds = items.map(t => t.id);
        reorderMutation.mutate(newOrderIds);
    } catch (e) {
        console.error(e);
    }
  };

  // --- 算出プロパティ (Computed) ---

  // 現在のビューに合わせて表示するタスクをフィルタリング
  const filteredTodos = allTodos.filter(t => {
    if (currentView === 'all' || currentView === 'dashboard') return true;
    return t.project_id === currentView;
  });

  // 数値（ID）の場合は該当するプロジェクト情報を取得
  const currentProject = typeof currentView === 'number' 
    ? projects.find(p => p.id === currentView) 
    : undefined;

  // 未ログイン時は認証フォームを表示
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md glass p-8 rounded-3xl animate-in zoom-in duration-500">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">
              BizFlow
            </h1>
            <p className="text-slate-500 font-medium">プロフェッショナルな業務管理を</p>
          </div>
          <AuthForm onAuthenticated={setToken} />
        </div>
        <Toaster position="bottom-right" />
      </div>
    );
  }

  // メインレイアウト
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex p-4 gap-6">
      {/* ナビゲーションサイドバー */}
      <Sidebar 
        projects={projects}
        currentView={currentView}
        onViewChange={setCurrentView}
        onLogout={handleLogout}
        theme={theme}
        onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
        onProjectCreated={handleDataChange}
      />

      {/* メインコンテンツ: ビューに応じて切り替え */}
      <main className="flex-1 max-w-5xl mx-auto w-full">
        {currentView === 'dashboard' ? (
          <DashboardView todos={allTodos} projects={projects} />
        ) : (
          <ProjectTasksView 
            project={currentProject}
            todos={filteredTodos}
            isLoading={isTodosLoading}
            onDataChange={handleDataChange}
            onDragEnd={handleDragEnd}
          />
        )}
      </main>

      {/* 通知コンポーネント */}
      <Toaster 
        position="bottom-right"
        toastOptions={{
          className: 'dark:bg-slate-800 dark:text-white rounded-xl border border-white/10 shadow-2xl',
          duration: 3000,
        }}
      />
    </div>
  );
}
