import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { useTheme } from "./useTheme";
import { useProjects } from "./useProjects";
import { useTodos, type Filter } from "./useTodos";

export type { Filter };
// 表示可能な画面（View）の型定義。数値の場合はプロジェクトIDを表す。
export type View = 'dashboard' | 'all' | 'audit' | 'monitor' | 'users' | number;

/**
 * 【アプリケーション統合ロジック・フック】
 * アプリ全体のメインの状態管理（Viewの選択、検索、フィルタ）や、
 * 個別に分離された機能（Auth, Theme, Projects, Todos）を統合し、
 * コンポーネントが使いやすい形で提供するカスタムフックです。
 */
export function useAppLogic() {
  // React Queryのクライアント。キャッシュの破棄（Invalidate）に使用します。
  const queryClient = useQueryClient();

  // --- UI固有のローカル状態管理 ---
  // 現在どの画面を表示しているか（ダッシュボード、設定、あるいは特定のプロジェクト）
  const [currentView, setCurrentView] = useState<View>('dashboard');
  // 全タスク表示時の絞り込み条件（今日、重要、期限切れ等）
  const [activeFilter, setActiveFilter] = useState<Filter | null>(null);
  // 全体検索バーに入力されたキーワード
  const [searchQuery, setSearchQuery] = useState("");

  // --- 機能別フックの集約（関心の分離） ---
  const { theme, setTheme, toggleTheme } = useTheme();                   // ダークモード管理
  const { token, setToken, currentUser, organization, handleLogout } = useAuth(); // 認証・ユーザー情報管理
  const { projects, handleEditProject, handleDeleteProject } = useProjects(token); // プロジェクト一覧・操作管理
  
  // タスク（Todo）の実データ。現在のViewや検索ワード、フィルタに応じて自動で絞り込まれます。
  const { allTodos, filteredTodos, isTodosLoading, handleDragEnd } = useTodos(
    token, 
    searchQuery, 
    currentView, 
    activeFilter
  );

  // --- 算出プロパティ (Derive State) ---
  // 現在のViewが数値（プロジェクトID）の場合、そのIDに一致するプロジェクト情報を取得
  const currentProject = typeof currentView === 'number' 
    ? projects.find(p => p.id === currentView) 
    : undefined;

  // --- 共通アクションハンドラー ---
  
  // データの作成・更新・削除後に呼び出され、キャッシュを最新化（再取得を指示）します。
  const handleDataChange = () => {
    queryClient.invalidateQueries({ queryKey: ["me"] });
    queryClient.invalidateQueries({ queryKey: ["organization"] });
    queryClient.invalidateQueries({ queryKey: ["todos"] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  };

  // ダッシュボード等から「特定のフィルタ」がクリックされた時の処理
  const handleFilterSelect = (filter: Filter) => {
    setActiveFilter(filter);
    setCurrentView('all'); // 全タスク画面に切り替えて、フィルタを適用
  };

  // 画面（サイドバーメニュー等）が切り替わった時の処理
  const handleViewChange = (view: View) => {
    setCurrentView(view);
    setActiveFilter(null); // 画面を変えたら絞り込みはリセット
  };

  // 現在表示中のプロジェクトの編集
  const onEditProject = () => {
    if (typeof currentView !== 'number' || !currentProject) return;
    handleEditProject(currentView, currentProject, handleDataChange);
  };

  // 現在表示中のプロジェクトの削除
  const onDeleteProject = () => {
    if (typeof currentView !== 'number' || !currentProject) return;
    handleDeleteProject(currentView, currentProject.name, () => {
      // 削除後の移動先をダッシュボードに設定
      setCurrentView('dashboard');
      handleDataChange();
    });
  };

  return {
    // 外部（Appコンポーネント等）に公開するプロパティ
    token,
    setToken,
    currentView,
    activeFilter,
    searchQuery,
    theme,
    projects,
    currentUser,
    organization,
    allTodos,
    filteredTodos,
    currentProject,
    isTodosLoading,

    // 状態変更用の setter
    setSearchQuery,
    setTheme,
    toggleTheme,
    setActiveFilter,

    // 定型的なイベントハンドラー
    handleLogout,
    handleDataChange,
    handleDragEnd,
    handleFilterSelect,
    handleViewChange,
    handleEditProject: onEditProject,
    handleDeleteProject: onDeleteProject
  };
}
