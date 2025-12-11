import { useState } from "react";
// API関数は外部ファイルからインポートされていると仮定
import { createTodo } from "../api";

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
  // 入力値が空かどうかをチェックするヘルパー変数
  const isInputEmpty = !title.trim();

  // フォーム送信時の処理
  const handleSubmit = async (e: React.FormEvent) => {
    // ページのリロードを防ぐ
    e.preventDefault();

    // 1. 入力値が空、または既にAPIコール中の場合は処理を中断
    if (isInputEmpty || isLoading) {
      return;
    }

    // ローディング開始
    setIsLoading(true);

    try {
      // 2. APIコールを実行し、新しいToDoを作成
      await createTodo({ title });

      // 3. 成功した場合のみ、フォームをクリアし、親コンポーネントを更新
      setTitle(""); // 入力フィールドを空にする
      onAdd();      // 親コンポーネントに更新を通知
    } catch (error) {
      // 4. APIコールが失敗した場合、エラーをコンソールに表示
      console.error("ToDoの作成に失敗しました。APIを確認してください:", error);
      // ユーザーにエラーメッセージを通知
      alert("タスクの追加に失敗しました。サーバーを確認してください。");
    } finally {
      // 5. 成功・失敗に関わらず、最後にローディングを終了
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-2">
      <input
        type="text"
        className="border rounded p-2 flex-grow"
        placeholder={isLoading ? "追加中です..." : "新しいタスクを入力"} // ローディング中はプレースホルダーを変更
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        // ローディング中は入力を無効化
        disabled={isLoading}
      />
      <button
        className={`rounded px-4 ${
          // 入力が空、またはローディング中の場合はボタンを無効化し、スタイルを変更
          isInputEmpty || isLoading
            ? "bg-gray-400 text-gray-700 cursor-not-allowed"
            : "bg-blue-500 hover:bg-blue-600 text-white"
        }`}
        // ボタンの無効化条件
        disabled={isInputEmpty || isLoading}
      >
        {/* ローディング中はテキストを変更 */}
        {isLoading ? "処理中..." : "追加"}
      </button>
    </form>
  );
}