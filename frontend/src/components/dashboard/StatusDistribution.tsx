import type { Todo } from '../../types';

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

interface StatusDistributionProps {
  todos: Todo[];
}

export default function StatusDistribution({ todos }: StatusDistributionProps) {
  const total = todos.length;
  const counts = {
    todo: todos.filter(t => t.status === 'TODO').length,
    inProgress: todos.filter(t => t.status === 'IN_PROGRESS').length,
    review: todos.filter(t => t.status === 'REVIEW').length,
    done: todos.filter(t => t.status === 'DONE').length,
  };

  return (
    <div className="glass p-8 rounded-3xl">
      <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-white">ステータス分布</h3>
      <div className="space-y-4">
        <StatusRow label="未着手" count={counts.todo} total={total} color="bg-slate-400" />
        <StatusRow label="進行中" count={counts.inProgress} total={total} color="bg-amber-400" />
        <StatusRow label="レビュー中" count={counts.review} total={total} color="bg-indigo-400" />
        <StatusRow label="完了" count={counts.done} total={total} color="bg-green-400" />
      </div>
    </div>
  );
}
