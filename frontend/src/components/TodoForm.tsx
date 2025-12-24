import { useState } from "react";
import { createTodo, breakdownTask } from "../api";
import { toast } from "react-hot-toast";

interface Props {
  /** 親コンポーネントでTODOリストを再取得（更新）するためのコールバック関数 */
  onAdd: () => void;
}

/**
 * TodoForm コンポーネント
 * ユーザーが新しいタスクを入力し、「通常追加」または「AIによるタスク分解」を選択できるフォーム。
 */
export default function TodoForm({ onAdd }: Props) {
  // --- 状態管理 (State) ---
  
  /** 入力中のタスクタイトル */
  const [title, setTitle] = useState("");
  
  /** 通常のタスク保存 API が通信中かどうか */
  const [isLoading, setIsLoading] = useState(false);
  
  /** AI API による分解処理および、その後の連続保存処理が進行中かどうか */
  const [isAiLoading, setIsAiLoading] = useState(false);

  /** * 入力バリデーション: 空文字、またはスペースのみの場合は操作を無効化する
   * フォームの `disabled` 属性やクリックガードに使用。
   */
  const isInputEmpty = !title.trim();

  /**
   * ハンドラ: 通常のタスク追加
   * 1つのタイトルをそのままサーバーへ保存します。
   */
  const handleSubmit = async (e: React.FormEvent) => {
    // フォーム送信によるページリロードを防止
    e.preventDefault();

    // 二重送信の防止（入力なし or いずれかの通信中なら何もしない）
    if (isInputEmpty || isLoading || isAiLoading) return;

    setIsLoading(true);
    
    // toast.loading は「保留中」の状態を表示し、後で success/error に更新できる ID を返す
    const toastId = toast.loading("タスクを追加中...");

    try {
      // API 経由で新規作成
      await createTodo({ title });
      
      // 成功時の処理:
      setTitle(""); // 入力欄をクリア
      onAdd();      // リストを更新するように親へ通知
      
      // 既存のトーストを成功表示に書き換える
      toast.success("タスクを追加しました！", { id: toastId });
    } catch (error) {
      // エラーオブジェクトからメッセージを抽出
      const errorMessage = error instanceof Error ? error.message : "追加に失敗しました";
      toast.error(errorMessage, { id: toastId });
    } finally {
      // 成功・失敗に関わらずローディング状態を解除
      setIsLoading(false);
    }
  };

  /**
   * ハンドラ: AIによるタスク分解
   * 入力された大きなタスクを AI が小さなステップに分け、それらを個別の TODO として一括登録します。
   */
  const handleAiBreakdown = async () => {
    if (isInputEmpty || isAiLoading) return;
    
    setIsAiLoading(true);
    const toastId = toast.loading("AIが思考中... 🧠");

    try {
      // 1. AI APIを叩き、文字列の配列（例: ["材料を買う", "野菜を切る", ... ]）を取得
      const subtasks = await breakdownTask(title);

      /**
       * 2. 取得した各サブタスクを順次 API で保存
       * ※ ここでは for...of 文を使い、1つずつ順番に完了を待ちます（直列処理）。
       * ※ 並列で行いたい場合は Promise.all(subtasks.map(...)) も検討。
       */
      for (const subtaskTitle of subtasks) {
        await createTodo({ title: subtaskTitle });
      }
      
      // すべての処理が完了した後の後処理
      setTitle("");
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
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
    >
      {/* 入力エリア */}
      <div className="relative group">
        <input
          type="text"
          className="w-full bg-white/50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 pl-12 text-lg focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400 dark:text-white"
          // 通信中かどうかでプレースホルダーの内容を切り替える
          placeholder={isAiLoading ? "AIがステップを生成しています..." : "何をしますか？"} 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isLoading || isAiLoading} // 通信中は入力をロック
        />
        
        {/* 装飾用の左側アイコン（検索・追加をイメージ） */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
        </div>
      </div>
      
      {/* 操作ボタンエリア */}
      <div className="flex gap-3">
        {/* AI分解ボタン: 
            グラデーション色を使用して、通常の追加ボタンよりも特別な機能であることを視覚的に強調。
        */}
        <button
            type="button" // form 内で submit させないために type="button" を明示
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

        {/* 通常の追加ボタン:
            デフォルトの submit アクション（handleSubmit）を発火させます。
        */}
        <button
            type="submit"
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