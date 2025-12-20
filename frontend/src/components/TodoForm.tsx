import { useState } from "react";
import { createTodo, breakdownTask } from "../api";
import { toast } from "react-hot-toast";

interface Props {
  onAdd: () => void;
}

export default function TodoForm({ onAdd }: Props) {
  // --- 状態管理 (State) ---
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false); // 通常の追加処理中
  const [isAiLoading, setIsAiLoading] = useState(false); // AI分解処理中

  // 入力が空かどうか（空白のみも含む）
  const isInputEmpty = !title.trim();

  /**
   * 通常のタスク追加処理
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInputEmpty || isLoading || isAiLoading) return;

    setIsLoading(true);
    // トースト通知の開始（読み込み中状態）
    const toastId = toast.loading("タスクを追加中...");
    try {
      await createTodo({ title });
      setTitle(""); 
      onAdd(); 
      // 成功時にトーストを更新
      toast.success("タスクを追加しました！", { id: toastId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "追加に失敗しました";
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * AIによるタスク分解処理
   * 入力されたタスクを具体的なステップに分け、一括でTODOに追加します。
   */
  const handleAiBreakdown = async () => {
    if (isInputEmpty || isAiLoading) return;
    
    setIsAiLoading(true);
    const toastId = toast.loading("AIが思考中... 🧠");
    try {
      // 1. AIからサブタスクのリストを取得
      const subtasks = await breakdownTask(title);
      // 2. 取得した各サブタスクを順次TODOとして作成
      for (const subtaskTitle of subtasks) {
        await createTodo({ title: subtaskTitle });
      }
      
      setTitle("");
      onAdd();
      toast.success("AIがタスクを分解しました！", { id: toastId });
    } catch (error) {
        toast.error("AIによる分解に失敗しました", { id: toastId });
    } finally {
        setIsAiLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
    >
      {/* 入力エリア: アイコン付きのリッチなインポート */}
      <div className="relative group">
        <input
          type="text"
          className="w-full bg-white/50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 pl-12 text-lg focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400 dark:text-white"
          placeholder={isAiLoading ? "AIがステップを生成しています..." : "何をしますか？"} 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isLoading || isAiLoading}
        />
        {/* 左側のプラスアイコン */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
        </div>
      </div>
      
      {/* ボタンエリア */}
      <div className="flex gap-3">
        {/* AI分解ボタン: グラデーション背景でアピール */}
        <button
            type="button" 
            onClick={handleAiBreakdown}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-md ${
            isInputEmpty || isLoading || isAiLoading
                ? "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600"
                : "bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:shadow-lg hover:scale-[1.02] active:scale-95"
            }`}
            disabled={isInputEmpty || isLoading || isAiLoading}
        >
            {isAiLoading ? (
              <span className="animate-pulse">✨ 生成中...</span>
            ) : (
              <>✨ AI分解</>
            )}
        </button>

        {/* 通常の追加ボタン */}
        <button
            className={`px-8 py-3 rounded-2xl font-bold transition-all shadow-md ${
            isInputEmpty || isLoading || isAiLoading
                ? "bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500"
                : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:scale-[1.02] active:scale-95"
            }`}
            disabled={isInputEmpty || isLoading || isAiLoading}
        >
            {isLoading ? "追加中..." : "追加"}
        </button>
      </div>
    </form>
  );
}



