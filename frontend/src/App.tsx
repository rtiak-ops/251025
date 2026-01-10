import { useEffect, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type DropResult } from "@hello-pangea/dnd";
import { getTodos, getStoredToken, clearToken, reorderTodos, getProjectSummaries, updateProject, deleteProject } from "./api";
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
  
  // フィルタータイプ
  type Filter = {
    label: string;
    priority?: Todo['priority'];
    status?: Todo['status'];
    completed?: boolean;
  };
  
  // フィルター状態
  const [activeFilter, setActiveFilter] = useState<Filter | null>(null);
  
  // テーマ（ライト/ダークモード）
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("theme");
    return stored === "light" || stored === "dark" 
      ? stored 
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  // --- データ取得 (React Query) ---

  // プロジェクト一覧と進捗サマリーを取得
  const { data: projectsData } = useQuery<ProjectSummary[]>({
    queryKey: ["projects"],
    queryFn: getProjectSummaries,
    enabled: !!token,
  });
  const projects = Array.isArray(projectsData) ? projectsData : [];

  // すべてのタスクを取得
  const { 
    data: todosData, 
    isLoading: isTodosLoading
  } = useQuery<Todo[]>({
    queryKey: ["todos"],
    queryFn: getTodos,
    enabled: !!token,
  });
  const allTodos = Array.isArray(todosData) ? todosData : [];

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

  /**
   * ダッシュボードの統計カードクリック時のハンドラー
   */
  const handleFilterSelect = (filter: Filter) => {
    setActiveFilter(filter);
    setCurrentView('all'); // フィルター時は「すべてのタスク」ビューに遷移
  };

  const handleViewChange = (view: 'dashboard' | 'all' | number) => {
    setCurrentView(view);
    setActiveFilter(null); // ビュー切り替え時はフィルターをリセット
  };

  /** プロジェクトの編集ハンドラー */
  const handleEditProject = async () => {
    if (typeof currentView !== 'number' || !currentProject) return;
    
    const newName = window.prompt("プロジェクト名を変更:", currentProject.name);
    if (newName === null) return; // キャンセル
    
    const newDesc = window.prompt("プロジェクトの説明を変更:", currentProject.description || "");
    if (newDesc === null) return;

    try {
      await updateProject(currentView, { name: newName, description: newDesc });
      toast.success("プロジェクトを更新しました");
      handleDataChange();
    } catch {
      toast.error("更新に失敗しました");
    }
  };

  /** プロジェクトの削除ハンドラー */
  const handleDeleteProject = async () => {
    if (typeof currentView !== 'number' || !currentProject) return;
    
    if (!window.confirm(`プロジェクト「${currentProject.name}」を削除しますか？配下のタスクもすべて削除されます。`)) {
      return;
    }

    try {
      await deleteProject(currentView);
      toast.success("プロジェクトを削除しました");
      setCurrentView('dashboard');
      handleDataChange();
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  // --- 算出プロパティ (Computed) ---

  // 現在のビューに合わせて表示するタスクをフィルタリング
  const filteredTodos = allTodos.filter(t => {
    // 1. ビューのチェック
    const matchesView = currentView === 'all' || currentView === 'dashboard' || t.project_id === currentView;
    if (!matchesView) return false;

    // 2. フィルターのチェック
    if (activeFilter) {
      if (activeFilter.priority && t.priority !== activeFilter.priority) return false;
      if (activeFilter.status && t.status !== activeFilter.status) return false;
      if (activeFilter.completed !== undefined && t.completed !== activeFilter.completed) return false;
    }

    return true;
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
            <p className="text-slate-500 dark:text-white font-medium">プロフェッショナルな業務管理を</p>
          </div>
          <AuthForm onAuthenticated={setToken} />
        </div>
        <Toaster position="bottom-right" />
      </div>
    );
  }

  // メインレイアウト
  return (
    <div className="min-h-screen flex p-4 gap-6">
      {/* ナビゲーションサイドバー */}
      <Sidebar 
        projects={projects}
        currentView={currentView}
        onViewChange={handleViewChange}
        onLogout={handleLogout}
        theme={theme}
        onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
        onProjectCreated={handleDataChange}
      />

      {/* メインコンテンツ: ビューに応じて切り替え */}
      <main className="flex-1 max-w-5xl mx-auto w-full">
        {currentView === 'dashboard' ? (
          <DashboardView todos={allTodos} projects={projects} onFilterSelect={handleFilterSelect} />
        ) : (
          <ProjectTasksView 
            project={currentProject}
            todos={filteredTodos}
            isLoading={isTodosLoading}
            onDataChange={handleDataChange}
            onDragEnd={handleDragEnd}
            activeFilter={activeFilter}
            onClearFilter={() => setActiveFilter(null)}
            onEditProject={handleEditProject}
            onDeleteProject={handleDeleteProject}
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
