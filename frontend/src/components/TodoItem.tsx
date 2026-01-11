import { useRef } from "react";
import type { Todo } from "../types";
import { updateTodo, deleteTodo } from "../api";
import { toast } from "react-hot-toast";
import { Trash2, Calendar } from "lucide-react";

interface Props {
  todo: Todo;
  onChange: () => void;
}

/**
 * TodoItem.tsx
 * 個別のタスクを表示し、完了状態の切り替え、ステータスの変更、削除を行うコンポーネント。
 */
export default function TodoItem({ todo, onChange }: Props) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof pickerInput.showPicker === 'function') {
      try {
        pickerInput.showPicker();
      } catch {
        input.click();
      }
    } else {
      input.click();
    }
  };
  /**
   * 完了チェックボックスの切り替えハンドラー
   * completed 状態に合わせて status も自動的に更新します。
   */
  const toggle = async () => {
    try {
      const newStatus = todo.completed ? 'TODO' : 'DONE';
      await updateTodo(todo.id, { 
        completed: !todo.completed,
        status: newStatus
      });
      onChange(); // 親コンポーネントにデータの再取得を依頼
    } catch {
      toast.error("更新に失敗しました");
    }
  };

  /**
   * ステータス（未着手・進行中等）の個別更新ハンドラー
   */
  const updateStatus = async (status: Todo['status']) => {
    try {
      await updateTodo(todo.id, { 
        status,
        // DONE になった場合は completed も true にする
        completed: status === 'DONE'
      });
      onChange();
    } catch {
      toast.error("ステータスの更新に失敗しました");
    }
  };

  /**
   * タスクの削除ハンドラー
   */
  const remove = async () => {
    try {
      await deleteTodo(todo.id);
      onChange();
      toast.success("削除しました");
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  return (
    <div className="flex justify-between items-center group p-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-all rounded-2xl">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* 透明感のあるカスタムチェックボックス */}
        <input 
          type="checkbox" 
          checked={todo.completed} 
          onChange={toggle} 
          className="size-5 rounded-lg border-2 border-slate-300 transition-all cursor-pointer accent-indigo-600"
        />
        
        <div className="flex flex-col min-w-0">
          {/* タスク属性バッジエリア */}
          <div className="flex items-center gap-2 mb-1 overflow-x-auto no-scrollbar">
            {/* 優先度バッジ：重要度に応じて配色を変更 */}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex-shrink-0 border ${
              todo.priority === 'URGENT' ? 'bg-red-500 text-white border-red-600 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30' :
              todo.priority === 'HIGH' ? 'bg-amber-500 text-white border-amber-600 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30' :
              todo.priority === 'MEDIUM' ? 'bg-blue-500 text-white border-blue-600 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30' :
              'bg-slate-500 text-white border-slate-600 dark:bg-slate-700 dark:text-white dark:border-slate-600'
            }`}>
              {todo.priority === 'URGENT' ? '至急' :
               todo.priority === 'HIGH' ? '高' :
               todo.priority === 'MEDIUM' ? '中' : '低'}
            </span>

            {/* ステータス選択ドロップダウン：バッジ風のデザイン */}
            <select 
              value={todo.status}
              onChange={(e) => updateStatus(e.target.value as Todo['status'])}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer border-none focus:ring-0 flex-shrink-0 appearance-none bg-transparent ${
                todo.status === 'DONE' ? 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' :
                todo.status === 'REVIEW' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' :
                todo.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' :
                'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-white'
              }`}
            >
              <option value="TODO" className="dark:bg-slate-800 text-slate-700 dark:text-white">未着手</option>
              <option value="IN_PROGRESS" className="dark:bg-slate-800 text-slate-700 dark:text-white">進行中</option>
              <option value="REVIEW" className="dark:bg-slate-800 text-slate-700 dark:text-white">レビュー</option>
              <option value="DONE" className="dark:bg-slate-800 text-slate-700 dark:text-white">完了</option>
            </select>
          </div>

          {/* タイトル：完了時は打ち消し線を表示 */}
          <span
            className={`text-base font-semibold truncate transition-all duration-300 ${
              todo.completed
                ? "line-through text-slate-400 dark:text-white/50"
                : "text-slate-700 dark:text-white"
            }`}
          >
            {todo.title}
          </span>
          {/* 説明文：1行で省略表示 */}
          {todo.description && (
            <span className="text-xs text-slate-400 dark:text-white/80 line-clamp-1">
              {todo.description}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4">
        {/* 期限日表示：クリックして変更可能（作成後も編集可能） */}
        <div 
          onClick={handleDatePicker}
          className="relative flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg flex-shrink-0 group/date hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
        >
          <Calendar size={12} className="text-slate-400 group-hover/date:text-indigo-500 transition-colors" />
          <span className={todo.due_date ? "text-indigo-600 dark:text-indigo-400" : ""}>
            {todo.due_date ? new Date(todo.due_date).toLocaleDateString() : '期限設定'}
          </span>
          <input
            ref={dateInputRef}
            type="date"
            className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
            value={todo.due_date ? todo.due_date.split('T')[0] : ""}
            onChange={async (e) => {
              try {
                await updateTodo(todo.id, { due_date: e.target.value || undefined });
                onChange();
                toast.success("期限を更新しました");
              } catch {
                toast.error("期限の更新に失敗しました");
              }
            }}
          />
        </div>
        {/* 削除ボタン：ホバー時のみ表示 */}
        <button
          onClick={remove}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
          title="タスクを削除"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
