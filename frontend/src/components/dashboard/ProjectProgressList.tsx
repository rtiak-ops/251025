import type { ProjectSummary } from '../../types';

interface ProjectProgressListProps {
  projects: ProjectSummary[];
}

export default function ProjectProgressList({ projects }: ProjectProgressListProps) {
  return (
    <div className="lg:col-span-2 glass p-8 rounded-3xl">
      <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-white">プロジェクト別進捗</h3>
      <div className="space-y-6">
        {projects.length === 0 ? (
          <p className="text-slate-500 text-center py-10">プロジェクトがありません</p>
        ) : (
          projects.map(p => {
            const rate = p.todo_count > 0 ? Math.round((p.completed_count / p.todo_count) * 100) : 0;
            return (
              <div key={p.id} className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-slate-700 dark:text-white">{p.name}</span>
                  <span className="text-indigo-600">{rate}%</span>
                </div>
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
  );
}
