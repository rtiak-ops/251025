import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Toaster, toast } from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTodos, getStoredToken, clearToken, reorderTodos } from "./api";
import type { Todo } from "./types";
import TodoItem from "./components/TodoItem";
import TodoForm from "./components/TodoForm";
import AuthForm from "./components/AuthForm";
import TodoSkeleton from "./components/TodoSkeleton";

/**
 * メインのアプリケーションコンポーネント
 * React Query (TanStack Query) を導入してデータ取得とキャッシュ管理を最適化
 */
export default function App() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("theme");
    return stored === "light" || stored === "dark" 
      ? stored 
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  // ----------------------------------------------------------------------
  // React Query: ToDoリストの取得
  // ----------------------------------------------------------------------
  const { 
    data: todos = [], // 取得成功時のデータ（初期値は空配列）
    isLoading,        // ローディング中かどうか
    isError,          // エラーが発生したか
    error             // エラーオブジェクト
  } = useQuery<Todo[]>({
    queryKey: ["todos"], // キャッシュのキー
    queryFn: getTodos,   // 実行する関数
    enabled: !!token,    // トークンがあるときだけ実行
  });

  // エラーハンドリング（React Queryのエラー状態監視）
  useEffect(() => {
    if (isError) {
      console.error("ToDoリストの取得エラー:", error);
      toast.error("データの取得に失敗しました");
    }
  }, [isError, error]);

  // ----------------------------------------------------------------------
  // React Query: 並び替えの更新 (Mutation)
  // ----------------------------------------------------------------------
  const reorderMutation = useMutation({
    mutationFn: (newOrderIds: number[]) => reorderTodos(newOrderIds),
    onSuccess: () => {
      // 成功したらキャッシュを無効化して最新データを再取得（念の為）
      // 今回はonDragEndで楽観的更新(setQueryData)をしているので、
      // 厳密には必須ではないが、整合性を保つために記述
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
    onError: () => {
      toast.error("並び替えに失敗しました");
      // 失敗時はキャッシュを無効化してサーバーの正しい順序に戻す
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    }
  });

  // テーマ切り替え
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleAuthenticated = (newToken: string) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    clearToken();
    setToken(null);
    queryClient.clear(); // ログアウト時にキャッシュをクリア
    toast.success("ログアウトしました");
  };

  /**
   * データの変更があった場合にリストを更新するラッパー
   * TodoItemやTodoFormから呼ばれる
   */
  const handleDataChange = () => {
    queryClient.invalidateQueries({ queryKey: ["todos"] });
  };

  // ----------------------------------------------------------------------
  // ドラッグ＆ドロップのハンドリング
  // ----------------------------------------------------------------------
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(todos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // 1. 楽観的UI更新: サーバー応答を待たずにReact Queryのキャッシュを直接書き換える
    // これにより見た目の反映が爆速になる
    queryClient.setQueryData(["todos"], items);

    // 2. バックエンドへ送信
    try {
        const newOrderIds = items.map(t => t.id);
        // mutateAsyncを使うとPromiseを返せるのでawaitできるが、
        // ここではfire-and-forgetでも良い。エラー時はonErrorでロールバックされる。
        reorderMutation.mutate(newOrderIds);
    } catch (e) {
        // mutationのonErrorで処理されるためここは基本通らない
        console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 transition-colors duration-200 dark:bg-gray-900 dark:text-gray-100">
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-center">ToDo リスト</h1>
          <button
            className="rounded px-3 py-1 text-sm border border-gray-300 bg-white shadow-sm transition-colors duration-200 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="カラーテーマを切り替え"
          >
            {theme === "dark" ? "☀️ ライト" : "🌙 ダーク"}
          </button>
        </div>

        {!token ? (
          <AuthForm onAuthenticated={handleAuthenticated} />
        ) : (
          <>
            <div className="flex justify-end mb-2">
              <button
                className="text-sm text-blue-600 underline dark:text-blue-400"
                onClick={handleLogout}
              >
                ログアウト
              </button>
            </div>
            
            {/* 新規追加時はキャッシュを無効化して再取得 */}
            <TodoForm onAdd={handleDataChange} />

            <div className="mt-4 border rounded bg-white dark:border-gray-700 dark:bg-gray-800">
              {isLoading ? (
                <div className="p-4">
                  <TodoSkeleton />
                </div>
              ) : todos.length === 0 ? (
                <p className="p-4 text-center text-gray-500 dark:text-gray-300">
                  ToDoはありません。追加しましょう！✨
                </p>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  {/* Droppable: アイテムをドロップできる領域を定義（ここではリスト全体） */}
                  <Droppable droppableId="todos">
                    {(provided: any) => (
                      <div
                        {...provided.droppableProps} /* ライブラリが必要とするプロパティを展開して設定 */
                        ref={provided.innerRef}      /* ライブラリがDOM要素を参照するために必要 */
                      >
                        {todos.map((t, index) => (
                          /* Draggable: ドラッグ可能な個々のアイテム。keyとdraggableIdは一意である必要がある */
                          <Draggable key={t.id} draggableId={t.id.toString()} index={index}>
                            {(provided: any) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps} /* ドラッグ機能に必要なプロパティ */
                                {...provided.dragHandleProps} /* ドラッグハンドル（掴む部分）のプロパティ。ここではアイテム全体を掴めるように設定 */
                                className="border-b last:border-b-0 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" /* ドラッグ中に背景が透けないように色を指定 */
                              >
                                <TodoItem todo={t} onChange={handleDataChange} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {/* placeholder: ドラッグ中にリストのサイズが崩れないようにするためのスペースを確保 */}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </div>
          </>
        )}
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}
