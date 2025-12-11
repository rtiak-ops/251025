import { useEffect, useState } from "react";
// APIからToDoを取得する関数をインポート
import { getTodos } from "./api";
// ToDoの型定義をインポート
import type { Todo } from "./types";
// 各ToDoアイテムを表示するコンポーネントをインポート
import TodoItem from "./components/TodoItem";
// 新しいToDoを追加するためのフォームコンポーネントをインポート
import TodoForm from "./components/TodoForm";

/**
 * メインのアプリケーションコンポーネント
 * ToDoリストの全体的な状態管理と表示を担当
 */
export default function App() {
  // ToDoアイテムのリストを保持する状態
  const [todos, setTodos] = useState<Todo[]>([]);
  // データの読み込み中かどうかを管理する状態 (初期値はtrueで、最初の読み込み中を示す)
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /**
   * APIからToDoリストを読み込み、状態を更新する非同期関数
   * フォームからの追加やアイテムの変更後に再読み込みするためにも使用
   */
  const load = async () => {
    // データの取得開始時にローディング状態を true に設定
    setIsLoading(true);
    try {
      // APIからToDoリストを取得
      const data = await getTodos();
      // 取得したデータで todos 状態を更新
      setTodos(data);
    } catch (error) {
      // エラーが発生した場合、コンソールにエラーを出力
      console.error("ToDoリストの取得中にエラーが発生しました:", error);
      // ※ここではユーザーにエラーを通知する状態管理（例：setError(true)）を追加しても良い
    } finally {
      // データの取得（成功・失敗に関わらず）が完了したら、ローディング状態を false に設定
      setIsLoading(false);
    }
  };

  // コンポーネントがマウントされた時に一度だけ load 関数を実行
  // 依存配列 `[]` により、最初のレンダリング後に一度だけ実行される
  useEffect(() => {
    load();
  }, []);

  /**
   * コンポーネントのレンダリング部分
   */
  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">ToDo リスト</h1>
      
      {/* TodoForm: 新しいToDoを追加するフォーム
          onAdd={load} で、新しいToDoが追加された後にリストを再読み込みさせる */}
      <TodoForm onAdd={load} />

      <div className="mt-4 border rounded">
        {isLoading ? (
          // 1. ローディング状態が true の場合（データ取得中）: 読み込みメッセージを表示
          <p className="p-4 text-center text-gray-500">読み込み中... ⏳</p>
        ) : todos.length === 0 ? (
          // 2. ローディングが完了し、かつ ToDoリストが空の場合: データがない旨のメッセージを表示
          <p className="p-4 text-center text-gray-500">ToDoはありません。追加しましょう！✨</p>
        ) : (
          // 3. ローディングが完了し、ToDoリストにアイテムがある場合: リストを表示
          todos.map((t) => (
            // TodoItem: 各ToDoアイテムを表示し、変更（完了・削除など）があった場合は load でリストを再読み込み
            <TodoItem key={t.id} todo={t} onChange={load} />
          ))
        )}
      </div>
    </div>
  );
}