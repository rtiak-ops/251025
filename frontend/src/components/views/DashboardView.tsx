import { LayoutDashboard, CheckCircle2, Clock, AlertTriangle, Building2 } from 'lucide-react';
import type { Todo, ProjectSummary, Organization } from '../../types';
import StatCard from '../dashboard/StatCard';
import StatusDistribution from '../dashboard/StatusDistribution';
import ProjectProgressList from '../dashboard/ProjectProgressList';

interface DashboardViewProps {
  todos: Todo[];
  projects: ProjectSummary[];
  organization?: Organization;
  onFilterSelect: (filter: { label: string; priority?: Todo['priority']; status?: Todo['status']; completed?: boolean }) => void;
}

/**
 * 【ダッシュボードビュー (DashboardView)】
 * アプリケーションにログインした直後に表示されるメイン画面です。
 * 自分が関わる全てのタスクとプロジェクトの進捗状況をグラフィカルに可視化し、
 * 「至急」「進行中」「完了」といった重要な統計情報を一目で把握できるようにします。
 */
export default function DashboardView({ todos, projects, organization, onFilterSelect }: DashboardViewProps) {
  // データの整合性チェック
  const safeTodos = Array.isArray(todos) ? todos : [];
  const safeProjects = Array.isArray(projects) ? projects : [];

  // 各統計値の算出
  const completedTasks = safeTodos.filter(t => t.completed).length;                           // 完了済みの数
  const inProgressTasks = safeTodos.filter(t => !t.completed && t.status === 'IN_PROGRESS').length; // 着手中の数
  const completionRate = safeTodos.length > 0 ? Math.round((completedTasks / safeTodos.length) * 100) : 0; // 進捗率（％）
  const urgentTasks = safeTodos.filter(t => !t.completed && t.priority === 'URGENT').length;     // 未完了かつ最優先の数

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <LayoutDashboard className="text-indigo-600" size={32} />
            ダッシュボード
          </h2>
          {organization && (
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium pl-11">
              <Building2 size={16} />
              <span>{organization.name}</span>
            </div>
          )}
        </div>
        <div className="text-sm text-slate-500 dark:text-white font-medium bg-white/50 dark:bg-slate-800/50 px-4 py-2 rounded-full border border-white/20">
          最終更新: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* 統計カードセクション: クリックで各条件に絞り込んだタスク一覧へ遷移可能 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="最優先（至急）" 
          value={urgentTasks} 
          icon={<AlertTriangle className="text-red-500" />} 
          color="red"
          isAlert={urgentTasks > 0}
          onClick={() => onFilterSelect({ label: '至急タスク', priority: 'URGENT', completed: false })}
        />
        <StatCard 
          title="進行中" 
          value={inProgressTasks} 
          icon={<Clock className="text-amber-500" />} 
          color="amber"
          onClick={() => onFilterSelect({ label: '進行中のタスク', status: 'IN_PROGRESS', completed: false })}
        />
        <StatCard 
          title="完了済み" 
          value={completedTasks} 
          icon={<CheckCircle2 className="text-green-500" />} 
          color="green"
          subValue={`${completionRate}% 達成`}
          onClick={() => onFilterSelect({ label: '完了済みタスク', completed: true })}
        />
      </div>

      {/* 詳細進捗 & 分布グラフセクション */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* プロジェクトごとの個別の進捗バーリスト */}
        <ProjectProgressList projects={safeProjects} />
        {/* 全タスク内のステータス割合（TODO / IN_PROGRESS / DONE）を表示するグラフ */}
        <StatusDistribution todos={safeTodos} />
      </div>
    </div>
  );
}
