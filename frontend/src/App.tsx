import { Toaster } from "react-hot-toast";
import Sidebar from "./components/layout/Sidebar";
import DashboardView from "./components/views/DashboardView";
import ProjectTasksView from "./components/views/ProjectTasksView";
import AuthForm from "./components/views/AuthForm";
import AuditLogView from "./components/views/AuditLogView";
import MonitorView from "./components/views/MonitorView";
import UserManagementView from "./components/views/UserManagementView";
import MainLayout from "./components/layout/MainLayout";
import SearchBar from "./components/layout/SearchBar";
import { useAppLogic } from "./hooks/useAppLogic";

/**
 * App.tsx
 * アプリケーションのルートコンポーネント。
 * レイアウト、ロジック、各ビューを統合します。
 */
export default function App() {
  const {
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
    setSearchQuery,
    setTheme,
    setActiveFilter,
    handleLogout,
    handleDataChange,
    handleDragEnd,
    handleFilterSelect,
    handleViewChange,
    handleEditProject,
    handleDeleteProject
  } = useAppLogic();

  // 未ログイン状態（トークンがない）場合は、ログイン・新規登録画面を優先表示
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

  return (
    <MainLayout
      // サイドバー: アプリの左側に表示されるナビゲーション
      sidebar={
        <Sidebar 
          projects={projects}
          currentView={currentView}
          onViewChange={handleViewChange}
          onLogout={handleLogout}
          theme={theme}
          onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
          onProjectCreated={handleDataChange}
          currentUser={currentUser}
          organization={organization}
        />
      }
      // 検索バー: コンテンツの上部に固定される検索入力
      searchBar={
        <SearchBar 
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery("")}
        />
      }
    >
      {/* 
          メインコンテンツエリア: 
          currentViewの状態に基づいて、表示するView（画面）を動的に切り替えています。
          これを「条件付きレンダリング」と呼び、URLを変えずに画面遷移を実現しています。
      */}
      {currentView === 'dashboard' ? (
        // ダッシュボード: 統計と概要の表示
        <DashboardView todos={allTodos} projects={projects} onFilterSelect={handleFilterSelect} />
      ) : currentView === 'audit' ? (
        // 監査ログ: システム操作履歴の表示
        <AuditLogView />
      ) : currentView === 'monitor' ? (
        // システム管理: モニタリング情報の表示
        <MonitorView />
      ) : currentView === 'users' ? (
        // ユーザー管理: 組織のユーザー管理
        <UserManagementView currentUser={currentUser} />
      ) : (
        // プロジェクト詳細: タスク一覧やドラッグ&ドロップなどのタスク管理
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
          currentUser={currentUser}
        />
      )}

      {/* 通知トースト: 成功メッセージやエラーメッセージを右下に表示 */}
      <Toaster 
        position="bottom-right"
        toastOptions={{
          className: 'dark:bg-slate-800 dark:text-white rounded-xl border border-white/10 shadow-2xl',
          duration: 3000,
        }}
      />
    </MainLayout>
  );
}
