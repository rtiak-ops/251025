import { useState } from 'react';
import { updateTodo, deleteTodo } from '../../api';
import { toast } from 'react-hot-toast';
import { Clock, AlertTriangle, CheckCircle2, Trash2, Edit } from 'lucide-react';
import type { Todo } from '../../types';

interface TodoItemProps {
  todo: Todo;
  onChange: () => void;
}

export default function TodoItem({ todo, onChange }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(todo.title);

  const handleToggleComplete = async () => {
    try {
      await updateTodo(todo.id, { completed: !todo.completed });
      onChange();
    } catch {
      toast.error("更新に失敗しました");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("このタスクを削除しますか？")) return;
    try {
      await deleteTodo(todo.id);
      toast.success("削除しました");
      onChange();
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  const handleUpdateTitle = async () => {
    try {
      await updateTodo(todo.id, { title });
      setIsEditing(false);
      onChange();
    } catch {
      toast.error("更新に失敗しました");
    }
  };

  const priorityColors = {
    LOW: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    MEDIUM: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    HIGH: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    URGENT: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className={`p-4 flex items-center gap-4 group ${todo.completed ? 'opacity-60' : ''}`}>
      <button 
        onClick={handleToggleComplete}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
          todo.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-indigo-500'
        }`}
      >
        {todo.completed && <CheckCircle2 size={16} />}
      </button>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input 
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleUpdateTitle}
            onKeyDown={(e) => e.key === 'Enter' && handleUpdateTitle()}
            className="w-full bg-white dark:bg-slate-700 border border-indigo-500 rounded px-2 py-1 outline-none"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-2">
            <h4 className={`font-bold truncate dark:text-white ${todo.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
              {todo.title}
            </h4>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${priorityColors[todo.priority]}`}>
              {todo.priority}
            </span>
          </div>
        )}
        <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {new Date(todo.created_at).toLocaleDateString()}
          </span>
          {todo.status !== 'TODO' && (
            <span className="flex items-center gap-1 text-indigo-500">
              <AlertTriangle size={10} />
              {todo.status}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setIsEditing(true)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
          <Edit size={16} />
        </button>
        <button onClick={handleDelete} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
