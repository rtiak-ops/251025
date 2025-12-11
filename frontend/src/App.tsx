import { useEffect, useState } from "react";
import { getTodos, getStoredToken, clearToken } from "./api";
import type { Todo } from "./types";
import TodoItem from "./components/TodoItem";
import TodoForm from "./components/TodoForm";
import AuthForm from "./components/AuthForm";

/**
 * メインのアプリケーションコンポーネント
 * ToDoリストの全体的な状態管理と表示を担当
 */
export default function App() {
  // ToDoアイテムのリストを保持する状態
  const [todos, setTodos] = useState<Todo[]>([]);
  // データの読み込み中かどうかを管理する状態 (初期値はtrueで、最初の読み込み中を示す)
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [token, setToken] = useState<string | null>(getStoredToken());

  /**
   * APIからToDoリストを読み込み、状態を更新する非同期関数
   * フォームからの追加やアイテムの変更後に再読み込みするためにも使用
   */
  const load = async () => {
    if (!token) {
      return;
    }
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

  useEffect(() => {
    if (token) {
      load();
    }
  }, [token]);

  const handleAuthenticated = (newToken: string) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    clearToken();
    setToken(null);
    setTodos([]);
  };

  /**
   * コンポーネントのレンダリング部分
   */
  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">ToDo リスト</h1>

      {!token ? (
        <AuthForm onAuthenticated={handleAuthenticated} />
      ) : (
        <>
          <div className="flex justify-end mb-2">
            <button
              className="text-sm text-blue-600 underline"
              onClick={handleLogout}
            >
              ログアウト
            </button>
          </div>
          <TodoForm onAdd={load} />

          <div className="mt-4 border rounded">
            {isLoading ? (
              <p className="p-4 text-center text-gray-500">読み込み中... ⏳</p>
            ) : todos.length === 0 ? (
              <p className="p-4 text-center text-gray-500">
                ToDoはありません。追加しましょう！✨
              </p>
            ) : (
              todos.map((t) => <TodoItem key={t.id} todo={t} onChange={load} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}
