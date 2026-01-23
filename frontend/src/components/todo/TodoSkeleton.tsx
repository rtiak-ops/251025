/**
 * タスク読み込み中に表示するアニメーション（スケルトン）
 */
export default function TodoSkeleton() {
  return (
    <div className="p-4 flex items-center gap-4 bg-white/30 dark:bg-slate-800/30 rounded-2xl animate-pulse">
      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-1/2"></div>
      </div>
    </div>
  );
}
