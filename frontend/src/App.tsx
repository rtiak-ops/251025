import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"; // ドラッグ＆ドロップライブラリ
import { Toaster, toast } from "react-hot-toast"; // 通知表示用ライブラリ
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // データ取得・管理ライブラリ
import { getTodos, getStoredToken, clearToken, reorderTodos } from "./api"; // API通信用関数
import type { Todo } from "./types";
import TodoItem from "./components/TodoItem";
import TodoForm from "./components/TodoForm";
import AuthForm from "./components/AuthForm";
import TodoSkeleton from "./components/TodoSkeleton";

/**
 * メインのアプリケーションコンポーネント
 * 
 * アプリ全体のロジック（データ取得、認証状態、テーマ切り替えなど）をここで管理しています。
 * 画面の表示切り替え（ログイン画面 <-> Todoリスト画面）もここで行います。
 */
export default function App() {
  // === フックの定義 ===
  const queryClient = useQueryClient(); // キャッシュを操作するためのクライアントを取得
  
  // 認証トークンの状態管理（ローカルストレージから初期値を取得）
  const [token, setToken] = useState<string | null>(getStoredToken());
  
  // テーマ（ダークモード/ライトモード）の状態管理
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("theme");
    // 保存された設定があればそれを使い、なければOSの設定に合わせる
    return stored === "light" || stored === "dark" 
      ? stored 
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  // ----------------------------------------------------------------------
  // React Query: ToDoリストの取得 (useQuery)
  // ----------------------------------------------------------------------
  // サーバーからデータを取得し、todos変数に格納します。
  // isLoadingやisErrorなどの状態も自動で管理してくれます。
  const { 
    data: todos = [], // 取得したTodoリスト（データがない間は空配列[]を使う）
    isLoading,        // データ取得中かどうか（trueならSkeletonを表示）
    isError,          // エラーが発生したかどうか
    error             // エラーの内容
  } = useQuery<Todo[]>({
    queryKey: ["todos"], // このデータを識別するためのキー（キャッシュ管理に使われる）
    queryFn: getTodos,   // 実際にデータを取りに行く関数
    enabled: !!token,    // tokenが存在するときだけ実行する（ログインしていないときは実行しない）
  });

  // エラー発生時の処理（副作用）
  // isErrorがtrueになった瞬間に実行されます。
  useEffect(() => {
    if (isError) {
      console.error("ToDoリストの取得エラー:", error);
      toast.error("データの取得に失敗しました");
    }
  }, [isError, error]);

  // ----------------------------------------------------------------------
  // React Query: 並び替えの更新 (useMutation)
  // ----------------------------------------------------------------------
  // データの変更（作成・更新・削除）を行うためのフックです。
  const reorderMutation = useMutation({
    mutationFn: (newOrderIds: number[]) => reorderTodos(newOrderIds), // 実行する関数
    onSuccess: () => {
      // 成功時：念の為キャッシュを最新化（再取得）する
      // queryKey: ["todos"] のデータを古くなったものとしてマークし、再取得を促す
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
    onError: () => {
      // 失敗時：エラー通知を出し、キャッシュを無効化して正しい順序に戻す
      toast.error("並び替えに失敗しました");
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    }
  });

  // テーマ切り替えの副作用（DOM操作）
  // themeの値が変わるたびに実行され、htmlタグにクラスを付け外しする
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme); // 設定を保存
  }, [theme]);

  // ログイン成功時のコールバック
  const handleAuthenticated = (newToken: string) => {
    setToken(newToken);
  };

  // ログアウト処理
  const handleLogout = () => {
    clearToken();        // ローカルストレージから削除
    setToken(null);      // Reactの状態を更新
    queryClient.clear(); // ユーザー固有のキャッシュデータを全消去（セキュリティ＆バグ防止）
    toast.success("ログアウトしました");
  };

  /**
   * データの変更（追加・編集・削除）があった場合にリストを更新する関数
   * 子コンポーネント（TodoItemなど）に渡して使ってもらう
   */
  const handleDataChange = () => {
    queryClient.invalidateQueries({ queryKey: ["todos"] });
  };

  // ----------------------------------------------------------------------
  // ドラッグ＆ドロップ完了時の処理
  // ----------------------------------------------------------------------
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return; // ドロップ先がない場合は何もしない

    // 配列をコピーして並び替えを実行（直接stateを変更しないため）
    const items = Array.from(todos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // 1. 【楽観的UI更新】
    // サーバーからの応答を待たずに、手元のキャッシュを書き換えて画面を即座に更新する
    // これにより、ユーザーは待ち時間なしで操作できたように感じる
    queryClient.setQueryData(["todos"], items);

    // 2. バックエンドへ新しい順序を送信
    try {
        const newOrderIds = items.map(t => t.id);
        reorderMutation.mutate(newOrderIds); // 非同期で送信開始
    } catch (e) {
        // mutation自体のエラーはonErrorで処理される
        console.error(e);
    }
  };

  return (
    // 全体のレイアウトと背景色設定
    <div className="min-h-screen bg-gray-100 text-gray-900 transition-colors duration-200 dark:bg-gray-900 dark:text-gray-100">
      <div className="max-w-lg mx-auto p-4">
        {/* ヘッダー部分 */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-center">ToDo リスト</h1>
          {/* テーマ切り替えボタン */}
          <button
            className="rounded px-3 py-1 text-sm border border-gray-300 bg-white shadow-sm transition-colors duration-200 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="カラーテーマを切り替え"
          >
            {theme === "dark" ? "☀️ ライト" : "🌙 ダーク"}
          </button>
        </div>

        {/* 
          条件付きレンダリング: 
          tokenがない（未ログイン） -> AuthFormを表示
          tokenがある（ログイン済） -> Todoリストを表示
        */}
        {!token ? (
          <AuthForm onAuthenticated={handleAuthenticated} />
        ) : (
          <>
            {/* ログアウトボタン */}
            <div className="flex justify-end mb-2">
              <button
                className="text-sm text-blue-600 underline dark:text-blue-400"
                onClick={handleLogout}
              >
                ログアウト
              </button>
            </div>
            
            {/* Todo追加フォーム */}
            <TodoForm onAdd={handleDataChange} />

            {/* Todoリスト表示エリア */}
            <div className="mt-4 border rounded bg-white dark:border-gray-700 dark:bg-gray-800">
              {isLoading ? (
                // データ取得中はスケルトン（読み込み中のグレーの枠）を表示
                <div className="p-4">
                  <TodoSkeleton />
                </div>
              ) : todos.length === 0 ? (
                // データが空の場合のメッセージ
                <p className="p-4 text-center text-gray-500 dark:text-gray-300">
                  ToDoはありません。追加しましょう！✨
                </p>
              ) : (
                // データがある場合：ドラッグ＆ドロップ可能なリストを表示
                <DragDropContext onDragEnd={handleDragEnd}>
                  {/* Droppable: ドロップ可能な領域 */}
                  <Droppable droppableId="todos">
                    {(provided: any) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                      >
                        {todos.map((t, index) => (
                          /* Draggable: ドラッグ可能な各アイテム */
                          <Draggable key={t.id} draggableId={t.id.toString()} index={index}>
                            {(provided: any) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="border-b last:border-b-0 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                              >
                                <TodoItem todo={t} onChange={handleDataChange} />
                              </div>
                            )}
                          </Draggable>
                        ))}
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
      {/* 通知用コンポーネント（画面右下に配置） */}
      <Toaster position="bottom-right" />
    </div>
  );
}
