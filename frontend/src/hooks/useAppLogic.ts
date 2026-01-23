import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { useTheme } from "./useTheme";
import { useProjects } from "./useProjects";
import { useTodos, type Filter } from "./useTodos";

export type { Filter };
export type View = 'dashboard' | 'all' | 'audit' | 'monitor' | 'users' | number;

/**
 * Appコンポーネントのロジックを集約するメインフック。
 * 機能ごとに分割されたフック（useAuth, useTheme, useProjects, useTodos）を組み合わせて提供します。
 */
export function useAppLogic() {
  const queryClient = useQueryClient();

  // --- UI状態管理 (UI State) ---
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [activeFilter, setActiveFilter] = useState<Filter | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // --- 分割されたフックの呼び出し ---
  const { theme, setTheme, toggleTheme } = useTheme();
  const { token, setToken, currentUser, organization, handleLogout } = useAuth();
  const { projects, handleEditProject, handleDeleteProject } = useProjects(token);
  const { allTodos, filteredTodos, isTodosLoading, handleDragEnd } = useTodos(
    token, 
    searchQuery, 
    currentView, 
    activeFilter
  );

  // --- 算出プロパティ ---
  const currentProject = typeof currentView === 'number' 
    ? projects.find(p => p.id === currentView) 
    : undefined;

  // --- 共通ハンドラー ---
  const handleDataChange = () => {
    queryClient.invalidateQueries({ queryKey: ["me"] });
    queryClient.invalidateQueries({ queryKey: ["organization"] });
    queryClient.invalidateQueries({ queryKey: ["todos"] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  };

  const handleFilterSelect = (filter: Filter) => {
    setActiveFilter(filter);
    setCurrentView('all');
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    setActiveFilter(null);
  };

  const onEditProject = () => {
    if (typeof currentView !== 'number' || !currentProject) return;
    handleEditProject(currentView, currentProject, handleDataChange);
  };

  const onDeleteProject = () => {
    if (typeof currentView !== 'number' || !currentProject) return;
    handleDeleteProject(currentView, currentProject.name, () => {
      setCurrentView('dashboard');
      handleDataChange();
    });
  };

  return {
    // 状態
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

    // 状態変更
    setSearchQuery,
    setTheme,
    toggleTheme,
    setActiveFilter,

    // ハンドラー
    handleLogout,
    handleDataChange,
    handleDragEnd,
    handleFilterSelect,
    handleViewChange,
    handleEditProject: onEditProject,
    handleDeleteProject: onDeleteProject
  };
}
