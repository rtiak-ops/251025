import { LayoutDashboard, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import type { Todo, ProjectSummary } from '../types';

interface DashboardViewProps {
  todos: Todo[];
  projects: ProjectSummary[];
  onFilterSelect: (filter: { label: string; priority?: Todo['priority']; status?: Todo['status']; completed?: boolean }) => void;
}

/**
 * DashboardView.tsx
 * アプリケーションの全体統計を表示するダッシュボードビュー。
 * 全タスクの進捗状況やプロジェクト別の達成率を可視化します。
 */
export default function DashboardView({ todos, projects, onFilterSelect }: DashboardViewProps) {
  const safeTodos = Array.isArray(todos) ? todos : [];
  const safeProjects = Array.isArray(projects) ? projects : [];

  // --- 統計データの計算 ---
  const completedTasks = safeTodos.filter(t => t.completed).length; // 完了済み
  const inProgressTasks = safeTodos.filter(t => !t.completed && t.status === 'IN_PROGRESS').length; // 進行中
  const todoTasks = safeTodos.filter(t => !t.completed && t.status === 'TODO').length; // 未着手
  // 全体達成率（％）
  const completionRate = safeTodos.length > 0 ? Math.round((completedTasks / safeTodos.length) * 100) : 0;

  // 「至急」優先度の未完了タスク件数
  const urgentTasks = safeTodos.filter(t => !t.completed && t.priority === 'URGENT').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* ページタイトルセクション */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
          <LayoutDashboard className="text-indigo-600" size={32} />
          ダッシュボード
        </h2>
        <div className="text-sm text-slate-500 dark:text-white font-medium bg-white/50 dark:bg-slate-800/50 px-4 py-2 rounded-full border border-white/20">
          最終更新: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* 統計カードグリッド (3列) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="最優先（至急）" 
          value={urgentTasks} 
          icon={<AlertTriangle className="text-red-500" />} 
          color="red"
          isAlert={urgentTasks > 0} // 件数が0より多い場合にアラート表示
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
        {/* プロジェクト別進捗エリア (2/3幅) */}
        <div className="lg:col-span-2 glass p-8 rounded-3xl">
          <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-white">プロジェクト別進捗</h3>
          <div className="space-y-6">
            {safeProjects.length === 0 ? (
              <p className="text-slate-500 text-center py-10">プロジェクトがありません</p>
            ) : (
              safeProjects.map(p => {
                // プロジェクトごとの達成率計算
                const rate = p.todo_count > 0 ? Math.round((p.completed_count / p.todo_count) * 100) : 0;
                return (
                  <div key={p.id} className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-slate-700 dark:text-white">{p.name}</span>
                      <span className="text-indigo-600">{rate}%</span>
                    </div>
                    {/* プログレスバー本体 */}
                    <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
                        style={{ width: `${rate}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {p.completed_count} / {p.todo_count} タスク完了
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ステータス分布エリア (1/3幅) */}
        <div className="glass p-8 rounded-3xl">
          <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-white">ステータス分布</h3>
          <div className="space-y-4">
            <StatusRow label="未着手" count={todoTasks} total={safeTodos.length} color="bg-slate-400" />
            <StatusRow label="進行中" count={inProgressTasks} total={safeTodos.length} color="bg-amber-400" />
            <StatusRow label="レビュー中" count={safeTodos.filter(t => t.status === 'REVIEW').length} total={safeTodos.length} color="bg-indigo-400" />
            <StatusRow label="完了" count={completedTasks} total={safeTodos.length} color="bg-green-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 統計カード共通コンポーネント
 */
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  subValue?: string;
  isAlert?: boolean;
  onClick: () => void;
}

function StatCard({ title, value, icon, color, subValue, isAlert, onClick }: StatCardProps) {
  // Tailwindの動的クラス指定（JIT対応: 文字列をそのまま使うのではなく、マッピングにするのが安全）
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    amber: 'bg-amber-500/10 text-amber-500',
    red: 'bg-red-500/10 text-red-500',
  };

  const colorClass = colorMap[color] || 'bg-slate-500/10 text-slate-500';

  return (
    <div 
      onClick={onClick}
      className={`glass p-6 rounded-3xl relative overflow-hidden group hover:-translate-y-1 transition-all cursor-pointer ${isAlert ? 'ring-2 ring-red-500/50' : ''}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${colorClass}`}>
          {icon}
        </div>
        {/* 背景の波打つアニメーション（至急タスクがある場合のみ） */}
        {isAlert && <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping"></span>}
      </div>
      <div className="text-3xl font-bold text-slate-800 dark:text-white mb-1">{value}</div>
      <div className="text-sm font-medium text-slate-500 dark:text-white">{title}</div>
      {subValue && <div className="text-[10px] mt-2 font-bold text-green-500 dark:text-green-400 uppercase tracking-tight">{subValue}</div>}
    </div>
  );
}

/**
 * プロジェクト進捗など、割合を表示する行コンポーネント
 */
interface StatusRowProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

function StatusRow({ label, count, total, color }: StatusRowProps) {
  const percent = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium">
        <span className="text-slate-600 dark:text-white">{label}</span>
        <span className="text-slate-800 dark:text-white">{count}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}
