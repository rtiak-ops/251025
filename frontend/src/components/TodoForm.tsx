import { useState } from "react";
// API関数は外部ファイルからインポートされていると仮定
import { createTodo, breakdownTask } from "../api";

// 親コンポーネントから受け取るPropsの型定義
interface Props {
  // ToDoが正常に追加された後に親コンポーネントを更新するためのコールバック関数
  onAdd: () => void;
}

// ToDo追加用のフォームコンポーネント
export default function TodoForm({ onAdd }: Props) {
  // ToDoのタイトル（入力値）を保持するstate
  const [title, setTitle] = useState("");
  // APIコール中かどうかを管理するstate（ローディング状態）
  const [isLoading, setIsLoading] = useState(false);
  // AI生成中かどうか
  const [isAiLoading, setIsAiLoading] = useState(false);
  // 入力値が空かどうかをチェックするヘルパー変数
  const isInputEmpty = !title.trim();

  // フォーム送信時の処理
  const handleSubmit = async (e: React.FormEvent) => {
    // ページのリロードを防ぐ
    e.preventDefault();

    // 1. 入力値が空、または既にAPIコール中の場合は処理を中断
    if (isInputEmpty || isLoading || isAiLoading) {
      return;
    }

    // ローディング開始
    setIsLoading(true);

    try {
      // 2. APIコールを実行し、新しいToDoを作成
      await createTodo({ title });

      // 3. 成功した場合のみ、フォームをクリアし、親コンポーネントを更新
      setTitle(""); // 入力フィールドを空にする
      onAdd(); // 親コンポーネントに更新を通知
    } catch (error) {
      // 4. APIコールが失敗した場合、エラーをコンソールに表示
      const errorMessage =
        error instanceof Error
          ? error.message
          : "タスクの追加に失敗しました。サーバーを確認してください。";
      console.error("ToDoの作成に失敗しました:", errorMessage);
      // ユーザーにエラーメッセージを通知
      alert(errorMessage);
    } finally {
      // 5. 成功・失敗に関わらず、最後にローディングを終了
      setIsLoading(false);
    }
  };

  // AIタスク分解の処理
  const handleAiBreakdown = async () => {
    if (isInputEmpty || isAiLoading) return;
    setIsAiLoading(true);
    try {
      const subtasks = await breakdownTask(title);
      // 取得したサブタスクを順番に登録する
      // (本来は一括登録APIを作るべきだが、既存APIを再利用)
      for (const subtaskTitle of subtasks) {
        await createTodo({ title: subtaskTitle });
      }
      setTitle("");
      onAdd();
    } catch (error) {
        console.error("AIタスク分解に失敗しました:", error);
        alert("AI分解に失敗しました。");
    } finally {
        setIsAiLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row gap-2 p-2 bg-white border border-gray-200 rounded dark:bg-gray-800 dark:border-gray-700 items-stretch"
    >
      <input
        type="text"
        className="border rounded p-2 flex-grow bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
        placeholder={isLoading ? "追加中です..." : isAiLoading ? "AIが思考中...🧠" : "タスクを入力 (例: 旅行の計画)"} 
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        // ローディング中は入力を無効化
        disabled={isLoading || isAiLoading}
      />
      
      {/* ボタン群をフレックスコンテナでラップするか、またはそのまま配置。ここではモバイルでの押しやすさを考慮してボタンの高さを揃える */}
      <div className="flex gap-2">
        {/* AI分解ボタン */}
        <button
            type="button"
            onClick={handleAiBreakdown}
            className={`flex-1 sm:flex-none rounded px-3 py-2 text-sm flex items-center justify-center transition-colors duration-150 border whitespace-nowrap ${
            isInputEmpty || isLoading || isAiLoading
                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600 dark:border-gray-700"
                : "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900/50"
            }`}
            disabled={isInputEmpty || isLoading || isAiLoading}
            title="AIでタスクを具体的ステップに分解します"
        >
            {isAiLoading ? "✨生成中" : "✨AI分解"}
        </button>

        <button
            className={`flex-1 sm:flex-none rounded px-4 py-2 transition-colors duration-150 whitespace-nowrap ${
            // 入力が空、またはローディング中の場合はボタンを無効化し、スタイルを変更
            isInputEmpty || isLoading || isAiLoading
                ? "bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                : "bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-500"
            }`}
            // ボタンの無効化条件
            disabled={isInputEmpty || isLoading || isAiLoading}
        >
            {/* ローディング中はテキストを変更 */}
            {isLoading ? "処理中..." : "追加"}
        </button>
      </div>
    </form>
  );
}

