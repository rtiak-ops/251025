import { useState, useRef } from "react";
import { createTodo, breakdownTask } from "../api";
import { toast } from "react-hot-toast";
import { Plus, Sparkles, AlignLeft, Calendar } from "lucide-react";

interface Props {
  onAdd: () => void;
  initialProjectId?: number;
}

export default function TodoForm({ onAdd, initialProjectId }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [dueDate, setDueDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    if ('showPicker' in input && typeof (input as any).showPicker === 'function') {
      try { (input as any).showPicker(); } catch { input.click(); }
    } else {
      input.click();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isLoading || isAiLoading) return;

    setIsLoading(true);
    const toastId = toast.loading("タスクを保存中...");

    try {
      await createTodo({ 
        title: title.trim(), 
        description: description.trim() || undefined,
        priority, 
        project_id: initialProjectId,
        status: 'TODO',
        due_date: dueDate || undefined
      });
      
      setTitle("");
      setDescription("");
      setPriority('MEDIUM');
      setDueDate("");
      setIsExpanded(false);
      onAdd();
      toast.success("タスクを保存しました", { id: toastId });
    } catch (error) {
      toast.error("保存に失敗しました", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiBreakdown = async () => {
    if (!title.trim() || isAiLoading) return;
    setIsAiLoading(true);
    const toastId = toast.loading("AIがタスクを分解中...", { icon: "✨" });

    try {
      const subtasks = await breakdownTask(title);
      for (const subtaskTitle of subtasks) {
        await createTodo({ 
          title: subtaskTitle, 
          priority, 
          project_id: initialProjectId,
          status: 'TODO',
          due_date: dueDate || undefined
        });
      }
      
      setTitle("");
      setDescription("");
      setDueDate("");
      setIsExpanded(false);
      onAdd();
      toast.success("AI分解が完了しました", { id: toastId });
    } catch {
      toast.error("AI分解に失敗しました", { id: toastId });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className={`transition-all duration-300 ${isExpanded ? 'bg-white/40 dark:bg-slate-800/20 p-5 rounded-3xl border-2 border-indigo-500/20 shadow-xl' : ''}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* メイン入力セクション */}
        <div className="relative group">
          <div className="absolute left-4 top-4 text-indigo-500">
            <Plus size={24} className={isAiLoading ? "animate-spin" : ""} />
          </div>
          <input
            type="text"
            className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 pl-12 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-400 dark:text-white shadow-sm"
            placeholder={isAiLoading ? "思考中..." : "新しいタスクをクイック追加..."}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            disabled={isLoading || isAiLoading}
          />
        </div>

        {/* 展開される詳細セクション */}
        {isExpanded && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
            {/* 説明入力 */}
            <div className="relative">
              <div className="absolute left-4 top-3 text-slate-400">
                <AlignLeft size={18} />
              </div>
              <textarea
                placeholder="説明を追加 (オプション)..."
                className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 pl-12 text-sm focus:outline-none focus:border-indigo-500 transition-all dark:text-white min-h-[80px] resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* 設定項目グループ */}
            <div className="flex flex-wrap items-center gap-4">
              {/* 優先度セレクト */}
              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">
                  Priority
                </label>
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        priority === p
                          ? p === 'URGENT' ? 'bg-red-500 text-white shadow-lg' :
                            p === 'HIGH' ? 'bg-amber-500 text-white shadow-lg' :
                            p === 'MEDIUM' ? 'bg-indigo-500 text-white shadow-lg' :
                            'bg-slate-500 text-white shadow-lg'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      {p === 'LOW' ? '低' : p === 'MEDIUM' ? '中' : p === 'HIGH' ? '高' : '至急'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 締切設定 */}
              <div className="flex-1 min-w-[150px]">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">
                  Due Date
                </label>
                <div 
                  onClick={handleDatePicker}
                  className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all cursor-pointer text-slate-600 dark:text-slate-400"
                >
                  <Calendar size={16} />
                  <span className="text-xs font-bold">
                    {dueDate ? new Date(dueDate).toLocaleDateString() : "未設定"}
                  </span>
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="absolute opacity-0 pointer-events-none w-0 h-0"
                  />
                </div>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  if (!title) {
                    setTitle("");
                    setDueDate("");
                  }
                }}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                キャンセル
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAiBreakdown}
                  disabled={!title.trim() || isAiLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-500/10 to-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:from-purple-500 hover:to-indigo-500 hover:text-white transition-all shadow-sm group disabled:opacity-50"
                >
                  <Sparkles size={14} className="group-hover:animate-pulse" />
                  {isAiLoading ? "分解中..." : "AI分解"}
                </button>

                <button
                  type="submit"
                  disabled={!title.trim() || isLoading}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50"
                >
                  {isLoading ? "保存中..." : "タスクを追加"}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
