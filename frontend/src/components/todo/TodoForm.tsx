import { useState } from 'react';
import { createTodo, breakdownTask } from '../../api';
import { toast } from 'react-hot-toast';
import { PlusCircle, Send, Clock, Sparkles } from 'lucide-react';
import type { Todo } from '../../types';

interface TodoFormProps {
  onAdd: () => void;
  initialProjectId?: number;
}

export default function TodoForm({ onAdd, initialProjectId }: TodoFormProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Todo['priority']>("MEDIUM");
  const [dueDate, setDueDate] = useState<string>("");
  const [projectId] = useState<number | undefined>(initialProjectId);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBreakingDown, setIsBreakingDown] = useState(false);

  const handleAIBreakdown = async () => {
    if (!title.trim() || isBreakingDown) return;
    
    setIsBreakingDown(true);
    const loadingToast = toast.loading("AIがタスクを具体化・分解中...");
    
    try {
      const subtasks = await breakdownTask(title.trim());
      
      if (!subtasks || subtasks.length === 0) {
        throw new Error("No subtasks returned");
      }

      // 取得した各サブタスクを個別登録
      for (const subTitle of subtasks) {
        await createTodo({
          title: subTitle,
          priority,
          project_id: projectId,
          due_date: dueDate ? new Date(dueDate).toISOString() : undefined
        });
      }
      
      setTitle("");
      setDueDate("");
      onAdd();
      toast.success(`${subtasks.length}個のステップとして登録しました`, { id: loadingToast });
    } catch {
      toast.error("AI分解に失敗しました。Gemini API設定を確認してください。", { id: loadingToast });
    } finally {
      setIsBreakingDown(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createTodo({
        title: title.trim(),
        priority,
        project_id: projectId,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined
      });
      setTitle("");
      setDueDate("");
      onAdd();
      toast.success("タスクを追加しました");
    } catch {
      toast.error("追加に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <PlusCircle className="text-indigo-600" size={20} />
        <h3 className="font-bold text-slate-700 dark:text-white">新規タスク作成</h3>
      </div>
      
      <div className="space-y-3">
        <div className="relative group/input">
          <input 
            id="todo_title"
            name="todo_title"
            type="text" 
            placeholder="新しいタスクをクイック追加" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
          {title.trim() && !isSubmitting && (
            <button
              type="button"
              onClick={handleAIBreakdown}
              disabled={isBreakingDown}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all disabled:opacity-50"
              title="AIでタスクを自動分解"
            >
              <Sparkles size={20} className={isBreakingDown ? "animate-pulse" : ""} />
            </button>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as Todo['priority'][]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all border ${
                  priority === p 
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' 
                    : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1">
            <Clock size={14} className="text-slate-400" />
            <input 
              type="date" 
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-transparent text-[10px] font-bold text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={!title.trim() || isSubmitting}
          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={18} />
          {isSubmitting ? '保存中...' : 'タスクを追加'}
        </button>
      </div>
    </form>
  );
}
