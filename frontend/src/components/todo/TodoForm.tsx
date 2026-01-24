import { useState } from 'react';
import { createTodo } from '../../api';
import { toast } from 'react-hot-toast';
import { PlusCircle, Send } from 'lucide-react';
import type { Todo } from '../../types';

interface TodoFormProps {
  onAdd: () => void;
  initialProjectId?: number;
}

export default function TodoForm({ onAdd, initialProjectId }: TodoFormProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Todo['priority']>("MEDIUM");
  const [projectId] = useState<number | undefined>(initialProjectId);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createTodo({
        title: title.trim(),
        priority,
        project_id: projectId
      });
      setTitle("");
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
        <input 
          type="text" 
          placeholder="新しいタスクをクイック追加" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
        />
        
        <div className="flex gap-2">
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
