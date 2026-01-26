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
 * 【BizFlow メインアプリケーション】
 * アプリケーションの全体構造（レイアウト）と、各画面（View）の切り替えを管理するルートコンポーネントです。
 * 画面遷移のロジック、検索バー、サイドバー、各種通知（Toaster）を統合しています。
 */
export default function App() {
  // アプリケーション全体で共有される複雑なロジックをカスタムフックに集約して呼び出しています。
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

  // --- 認証チェック ---
  // 有効なトークンがない（未ログイン）場合は、認証フォーム（ログイン/会員登録）を大きく表示します。
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md glass p-8 rounded-3xl animate-in zoom-in duration-500 max-h-[calc(100vh-2rem)] overflow-y-auto">
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

  // --- メインレイアウト ---
  // サイドバーとメインコンテンツを含むレイアウトコンポーネントを構築します。
  return (
    <MainLayout
      // 左側のナビゲーションメニュー: 画面切り替え、ログアウト、プロジェクト一覧を表示
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
      // 上部の検索バー: 全タスクを対象にしたキーワード検索が可能
      searchBar={
        <SearchBar 
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery("")}
        />
      }
    >
      {/* 
          【コンテンツの切り替え】
          currentView 変数の値によって、中央部のコンテンツエリアを動的に変更（条件付きレンダリング）します。
      */}
      {currentView === 'dashboard' ? (
        // デフォルト画面: 自分の進捗状況、プロジェクト一覧、フィルタリングの要約
        <DashboardView todos={allTodos} projects={projects} organization={organization} onFilterSelect={handleFilterSelect} />
      ) : currentView === 'audit' ? (
        // 監査ログ画面: 管理者向け。システムの操作履歴を確認
        <AuditLogView />
      ) : currentView === 'monitor' ? (
        // 監視画面: 管理者向け。システムの負荷状況やDB接続状況を確認
        <MonitorView />
      ) : currentView === 'users' ? (
        // ユーザー管理: 管理者向け。組織のメンバー追加やロール変更が可能
        <UserManagementView currentUser={currentUser} />
      ) : (
        // プロジェクト詳細 / 全タスク一覧: 
        // かんばん形式またはリスト形式でのタスク管理（ドラッグ＆ドロップ対応）。
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

      {/* 
          【通知システム】
          操作の成功（保存完了など）やエラーをポップアップで表示するためのコンポーネント。
      */}
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
