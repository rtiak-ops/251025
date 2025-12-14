import { useState } from "react";
// API関数は外部ファイル（../api）からインポート。
// createTodo: 新しいToDoをサーバーに送信する関数
// breakdownTask: AIを使ってタスクをサブタスクに分解する関数
import { createTodo, breakdownTask } from "../api";

// 親コンポーネントから受け取るProps（プロパティ）の型定義
interface Props {
  // ToDoが正常に追加された後に呼び出されるコールバック関数。
  // これを実行することで、親コンポーネントはリストを再取得（リフレッシュ）できます。
  onAdd: () => void;
}

/**
 * TodoFormコンポーネント
 * 
 * ユーザーが新しいToDoを入力し、追加するためのフォームです。
 * AIによるタスク分解機能も提供しています。
 */
export default function TodoForm({ onAdd }: Props) {
  // ToDoのタイトル（入力値）を保持するstate。初期値は空文字。
  const [title, setTitle] = useState("");
  
  // 通常のタスク追加処理中かどうかを管理するstate（ローディング状態）。
  // trueの間はボタンを無効化して連打を防ぎます。
  const [isLoading, setIsLoading] = useState(false);
  
  // AIによるタスク分解処理中かどうかを管理するstate。
  const [isAiLoading, setIsAiLoading] = useState(false);

  // 入力値が空（または空白のみ）かどうかをチェックする便利変数。
  // ボタンの有効/無効の判定に使用します。
  const isInputEmpty = !title.trim();

  /**
   * フォーム送信時（「追加」ボタン押下またはEnterキー）の処理
   */
  const handleSubmit = async (e: React.FormEvent) => {
    // フォームのデフォルトの送信動作（ページリロード）をキャンセルします。
    e.preventDefault();

    // 入力が空、または既に何らかの処理中であれば何もしません。
    if (isInputEmpty || isLoading || isAiLoading) {
      return;
    }

    // ローディング状態を開始します。
    setIsLoading(true);

    try {
      // APIを呼び出して新しいToDoを作成します。
      await createTodo({ title });

      // 成功した場合:
      // 1. 入力フィールドをクリアします。
      setTitle(""); 
      // 2. 親コンポーネントに通知して、ToDoリストを更新してもらいます。
      onAdd(); 
    } catch (error) {
      // 失敗した場合:
      // エラーメッセージを生成して表示します。
      const errorMessage =
        error instanceof Error
          ? error.message
          : "タスクの追加に失敗しました。サーバーを確認してください。";
      console.error("ToDoの作成に失敗しました:", errorMessage);
      alert(errorMessage);
    } finally {
      // 成功・失敗に関わらず、処理が完了したらローディング状態を解除します。
      setIsLoading(false);
    }
  };

  /**
   * AIタスク分解ボタンが押された時の処理
   * 入力されたタスク名を元に、AIがサブタスクを提案・作成します。
   */
  const handleAiBreakdown = async () => {
    // 入力が空、または処理中なら何もしません。
    if (isInputEmpty || isAiLoading) return;
    
    // AI処理中の状態にします。
    setIsAiLoading(true);
    
    try {
      // 1. APIを呼んで、タスクを分解したリスト（文字列の配列）を取得します。
      const subtasks = await breakdownTask(title);
      
      // 2. 取得したサブタスクのリストをループし、1つずつToDoとして登録します。
      // (注意: 本来は一括登録APIがあるのが望ましいですが、ここでは既存のcreateTodoを再利用しています)
      for (const subtaskTitle of subtasks) {
        await createTodo({ title: subtaskTitle });
      }

      // 3. 全て完了したら入力欄をクリアし、リストを更新します。
      setTitle("");
      onAdd();
    } catch (error) {
        console.error("AIタスク分解に失敗しました:", error);
        alert("AI分解に失敗しました。");
    } finally {
        // 処理完了後にAI処理中状態を解除します。
        setIsAiLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      // スタイリング（Tailwind CSS）:
      // flex-col sm:flex-row -> スマホでは縦並び、画面が広いと横並び
      // items-stretch -> 子要素の高さを揃える
      className="flex flex-col sm:flex-row gap-2 p-2 bg-white border border-gray-200 rounded dark:bg-gray-800 dark:border-gray-700 items-stretch"
    >
      <input
        type="text"
        // 入力フィールドのスタイルとプレースホルダーの設定
        className="border rounded p-2 flex-grow bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
        // 状態に応じてプレースホルダーのテキストを変更し、ユーザーに状況を伝えます。
        placeholder={isLoading ? "追加中です..." : isAiLoading ? "AIが思考中...🧠" : "タスクを入力 (例: 旅行の計画)"} 
        value={title}
        // 入力内容が変更されたら state を更新
        onChange={(e) => setTitle(e.target.value)}
        // 処理中は入力を受け付けないようにします。
        disabled={isLoading || isAiLoading}
      />
      
      <div className="flex gap-2">
        {/* AI分解ボタン */}
        <button
            type="button" // formのsubmitではなく、ただのボタンとして動作させる
            onClick={handleAiBreakdown}
            // 条件付きスタイリング:
            // 入力が空や処理中の場合はグレーアウトし、それ以外は紫色のアクセントカラーにします。
            className={`flex-1 sm:flex-none rounded px-3 py-2 text-sm flex items-center justify-center transition-colors duration-150 border whitespace-nowrap ${
            isInputEmpty || isLoading || isAiLoading
                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600 dark:border-gray-700"
                : "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900/50"
            }`}
            disabled={isInputEmpty || isLoading || isAiLoading}
            title="AIでタスクを具体的ステップに分解します"
        >
            {/* 処理中はテキストを変えてフィードバックを返します */}
            {isAiLoading ? "✨生成中" : "✨AI分解"}
        </button>

        {/* 通常の追加ボタン */}
        <button
            // 条件付きスタイリング: 
            // 有効時は青色、無効時はグレー。
            className={`flex-1 sm:flex-none rounded px-4 py-2 transition-colors duration-150 whitespace-nowrap ${
            isInputEmpty || isLoading || isAiLoading
                ? "bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                : "bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-500"
            }`}
            disabled={isInputEmpty || isLoading || isAiLoading}
        >
            {isLoading ? "処理中..." : "追加"}
        </button>
      </div>
    </form>
  );
}

