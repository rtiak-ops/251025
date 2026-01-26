import { useState } from 'react';
import { createProject } from '../../api';
import { toast } from 'react-hot-toast';
import { Plus } from 'lucide-react';
import type { ProjectSummary, User, Organization } from '../../types';
import OrgRegistrationModal from '../organization/OrgRegistrationModal';

interface SidebarProps {
  projects: ProjectSummary[];
  currentView: 'dashboard' | 'all' | 'audit' | 'monitor' | 'users' | number;
  onViewChange: (view: 'dashboard' | 'all' | 'audit' | 'monitor' | 'users' | number) => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  onProjectCreated: () => void;
  currentUser?: User;
  organization?: Organization;
}

/**
 * Sidebar.tsx
 * アプリケーションのナビゲーションを司るサイドバー。
 */
export default function Sidebar({
  projects,
  currentView,
  onViewChange,
  onLogout,
  theme,
  onThemeToggle,
  onProjectCreated,
  currentUser,
  organization,
}: SidebarProps) {
  const [showOrgModal, setShowOrgModal] = useState(false);

  const handleCreateProject = async () => {
    const name = window.prompt("プロジェクト名を入力してください:");
    if (!name || !name.trim()) return;

    try {
      await createProject({ name, description: "" });
      toast.success("プロジェクトを作成しました");
      onProjectCreated();
    } catch {
      toast.error("作成に失敗しました");
    }
  };

  const handleCreateOrganization = () => {
    setShowOrgModal(true);
  };

  return (
    <aside className="w-64 glass h-[calc(100vh-2rem)] sticky top-4 flex flex-col p-6 rounded-3xl">
      <div className="mb-10">
        <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
          BizFlow
        </h1>
        {organization ? (
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
                {organization.plan}
              </span>
              {organization.is_verified && (
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                  ✓ 認証済
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-white font-bold truncate" title={organization.name}>
              🏢 {organization.name}
            </p>
          </div>
        ) : (
          <button 
            onClick={handleCreateOrganization}
            className="mt-2 text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
          >
            ＋ 組織を作成して法人利用を開始
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-400 dark:text-white/60 uppercase tracking-wider mb-2 px-2">
          メイン
        </div>
        
        <button
          onClick={() => onViewChange('dashboard')}
          className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
            currentView === 'dashboard'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-white'
          }`}
        >
          <span className="text-lg">📊</span> ダッシュボード
        </button>

        <button
          onClick={() => onViewChange('all')}
          className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
            currentView === 'all'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-white'
          }`}
        >
          <span className="text-lg">📅</span> すべてのタスク
        </button>
        {currentUser?.role === 'admin' && (
          <>
            <div className="pt-6 text-xs font-semibold text-slate-400 dark:text-white/60 uppercase tracking-wider mb-2 px-2">
              管理
            </div>
            
            <button
              onClick={() => onViewChange('audit')}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
                currentView === 'audit'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-white'
              }`}
            >
              <span className="text-lg">📜</span> 監査ログ
            </button>

            <button
              onClick={() => onViewChange('monitor')}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
                currentView === 'monitor'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-white'
              }`}
            >
              <span className="text-lg">📈</span> システム状況
            </button>

            <button
              onClick={() => onViewChange('users')}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
                currentView === 'users'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-white'
              }`}
            >
              <span className="text-lg">👥</span> ユーザー管理
            </button>
          </>
        )}

        <div className="pt-6 flex items-center justify-between mb-2 px-2">
          <span className="text-xs font-semibold text-slate-400 dark:text-white/60 uppercase tracking-wider">
            プロジェクト
          </span>
          <button 
            onClick={handleCreateProject}
            className="p-1 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all"
            title="新規プロジェクト"
          >
            <Plus size={16} />
          </button>
        </div>

        {Array.isArray(projects) && projects.map((project) => (
          <button
            key={project.id}
            onClick={() => onViewChange(project.id)}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between ${
              currentView === project.id
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-white'
            }`}
          >
            <span className="flex items-center gap-3 truncate">
              <span className="text-lg">📁</span>
              <span className="truncate">{project.name}</span>
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              currentView === project.id ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'
            }`}>
              {project.todo_count}
            </span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 space-y-4">
        <button
          onClick={onThemeToggle}
          className="w-full btn-secondary text-sm flex items-center justify-center gap-2"
        >
          {theme === "dark" ? "☀️ ライトモード" : "🌙 ダークモード"}
        </button>
        <button
          onClick={onLogout}
          className="w-full px-4 py-2 text-sm font-medium text-slate-500 dark:text-white hover:text-red-500 transition-colors flex items-center justify-center gap-2"
        >
          🚪 ログアウト
        </button>
      </div>

      {showOrgModal && (
        <OrgRegistrationModal 
          onClose={() => setShowOrgModal(false)}
          onSuccess={onProjectCreated}
        />
      )}
    </aside>
  );
}
