import { LayoutDashboard, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import type { Todo, ProjectSummary } from '../../types';
import StatCard from '../dashboard/StatCard';
import StatusDistribution from '../dashboard/StatusDistribution';
import ProjectProgressList from '../dashboard/ProjectProgressList';

interface DashboardViewProps {
  todos: Todo[];
  projects: ProjectSummary[];
  onFilterSelect: (filter: { label: string; priority?: Todo['priority']; status?: Todo['status']; completed?: boolean }) => void;
}

/**
 * アプリケーションの全体統計を表示するダッシュボードビュー。
 */
export default function DashboardView({ todos, projects, onFilterSelect }: DashboardViewProps) {
  const safeTodos = Array.isArray(todos) ? todos : [];
  const safeProjects = Array.isArray(projects) ? projects : [];

  const completedTasks = safeTodos.filter(t => t.completed).length;
  const inProgressTasks = safeTodos.filter(t => !t.completed && t.status === 'IN_PROGRESS').length;
  const completionRate = safeTodos.length > 0 ? Math.round((completedTasks / safeTodos.length) * 100) : 0;
  const urgentTasks = safeTodos.filter(t => !t.completed && t.priority === 'URGENT').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
          <LayoutDashboard className="text-indigo-600" size={32} />
          ダッシュボード
        </h2>
        <div className="text-sm text-slate-500 dark:text-white font-medium bg-white/50 dark:bg-slate-800/50 px-4 py-2 rounded-full border border-white/20">
          最終更新: {new Date().toLocaleTimeString()}
        </div>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <ProjectProgressList projects={safeProjects} />
        <StatusDistribution todos={safeTodos} />
      </div>
    </div>
  );
}
