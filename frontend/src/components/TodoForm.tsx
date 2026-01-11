import { useState } from "react";
import { createTodo, breakdownTask } from "../api";
import { toast } from "react-hot-toast";
import { Clock } from "lucide-react";

interface Props {
  /** 親コンポーネントでTODOリストを再取得（更新）するためのコールバック関数 */
  onAdd: () => void;
  /** 初期プロジェクトID（特定のプロジェクトビューから開いた場合） */
  initialProjectId?: number;
}

/**
 * TodoForm コンポーネント
 * ユーザーが新しいタスクを入力し、「通常追加」または「AIによるタスク分解」を選択できるフォーム。
 */
/**
 * TodoForm.tsx
 * ユーザーが新しいタスクを入力し、「通常追加」または「AIによるタスク分解」を選択できるフォーム。
 * ビジネス要件に合わせ、優先度（Priority）の選択機能も備えています。
 */
export default function TodoForm({ onAdd, initialProjectId }: Props) {
  // --- 状態管理 (State) ---
  
  /** 入力中のタスクタイトル */
  const [title, setTitle] = useState("");
  
  /** 通常のタスク保存 API が通信中かどうか */
  const [isLoading, setIsLoading] = useState(false);
  
  /** AI API による分解処理および、その後の連続保存処理が進行中かどうか */
  const [isAiLoading, setIsAiLoading] = useState(false);

  /** 優先度の選択状態 (デフォルトは「中」) */
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');

  /** 期限（締切）の選択状態 */
  const [dueDate, setDueDate] = useState("");

  /** 入力バリデーション: 空文字、またはスペースのみの場合は操作を無効化する */
  const isInputEmpty = !title.trim();

  /**
   * ハンドラ: 通常のタスク追加
   * 単一のタスクを現在のプロジェクト（もしあれば）に関連付けて保存します。
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInputEmpty || isLoading || isAiLoading) return;

    setIsLoading(true);
    const toastId = toast.loading("タスクを追加中...");

    try {
      await createTodo({ 
        title, 
        priority, 
        project_id: initialProjectId, // どのプロジェクト配下に追加するか
        status: 'TODO',
        due_date: dueDate || undefined
      });
      
      setTitle(""); // 入力欄のリセット
      setPriority('MEDIUM');
      setDueDate("");
      onAdd();      // 親側のデータを再取得
      toast.success("タスクを追加しました！", { id: toastId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "追加に失敗しました";
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * ハンドラ: AIによるタスク分解
   * 大きなタスクを AI が論理的なステップに分解し、それらを個別のタスクとして一括登録します。
   */
  const handleAiBreakdown = async () => {
    if (isInputEmpty || isAiLoading) return;
    
    setIsAiLoading(true);
    const toastId = toast.loading("AIが思考中... 🧠");

    try {
      // 1. AI APIを呼び出し、タスクの分解結果を文字列配列で取得
      const subtasks = await breakdownTask(title);

      // 2. 分解された各タスクを順次、現在のプロジェクトに関連付けて保存
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
      setPriority('MEDIUM');
      setDueDate("");
      onAdd();
      toast.success("AIがタスクを分解しました！", { id: toastId });
    } catch (error) {
        console.error("AI Breakdown Error:", error);
        toast.error("AIによる分解に失敗しました", { id: toastId });
    } finally {
        setIsAiLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {/* 1段目: テキスト入力フィールド (タイトル) */}
      <div className="relative group w-full">
        <input
          type="text"
          className="w-full bg-white/70 dark:bg-slate-900/80 border-2 border-slate-300 dark:border-slate-500 rounded-2xl p-4 pl-12 text-lg focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400 dark:text-white"
          placeholder={isAiLoading ? "AIがステップを生成しています..." : "新しいタスク名を入力..."} 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isLoading || isAiLoading}
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
      </div>

      {/* 2段目: 優先度、締切、アクションボタンを横一列に配置 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 優先度選択 */}
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-600">
          {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                priority === p
                  ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-white'
                  : 'text-slate-600 dark:text-white/70'
              }`}
            >
              {p === 'LOW' && '低'}
              {p === 'MEDIUM' && '中'}
              {p === 'HIGH' && '高'}
              {p === 'URGENT' && '至急'}
            </button>
          ))}
        </div>

        {/* 締切入力 */}
        <div className="relative flex items-center bg-slate-200 dark:bg-slate-800 p-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer min-w-[120px]">
          <div className="flex items-center gap-2 px-1 text-slate-500 dark:text-slate-400 pointer-events-none w-full justify-center">
            <Clock size={14} />
            <span className="text-[10px] font-bold">
              {dueDate ? new Date(dueDate).toLocaleDateString() : "締切を設定"}
            </span>
          </div>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>

        {/* スペーサー */}
        <div className="flex-1 min-w-[10px]" />

        {/* AI分解ボタン */}
        <button
          type="button"
          onClick={handleAiBreakdown}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
            isInputEmpty || isLoading || isAiLoading
              ? "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800"
              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-500 hover:shadow-md"
          }`}
          disabled={isInputEmpty || isLoading || isAiLoading}
        >
          {isAiLoading ? <span className="animate-pulse">✨ AI分解中...</span> : <><span className="text-sm">✨</span> AI分解</>}
        </button>

        {/* 通常追加ボタン */}
        <button
          type="submit"
          className={`px-6 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
            isInputEmpty || isLoading || isAiLoading
              ? "bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-700"
              : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md"
          }`}
          disabled={isInputEmpty || isLoading || isAiLoading}
        >
          {isLoading ? "中..." : "追加"}
        </button>
      </div>
    </form>
  );
}
