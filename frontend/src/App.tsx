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

  // 認証切れエラーのグローバル検知
  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      queryClient.clear();
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [queryClient]);

  // 一般的なエラー通知
  useEffect(() => {
    if (isError && (error as { status?: number })?.status !== 401) {
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
        console.error("並び替え中の予期せぬエラー:", e);
    }
  };

  return (
    // 全体のレイアウト設定: 余白(py-8)やグラデーション背景(CSS側で定義)を適用
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* === ヘッダーセクション === */}
        {/* glassクラス: index.cssで定義した「グラスモーフィズム（すりガラス効果）」を適用 */}
        <header className="flex items-center justify-between mb-8 glass p-6 rounded-3xl">
          <div>
            {/* タイトル: グラデーションテキスト(bg-clip-text)を使用してプレミアム感を演出 */}
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              TaskFlow
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">日々のタスクをスタイリッシュに管理</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* ダークモード切り替えボタン: btn-secondaryユーティリティを使用 */}
            <button
              className="btn-secondary text-sm flex items-center gap-2"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="テーマを切り替え"
            >
              {theme === "dark" ? "☀️ ライト" : "🌙 ダーク"}
            </button>
            
            {/* ログイン時のみログアウトボタンを表示 */}
            {token && (
              <button
                className="text-sm font-medium text-slate-500 hover:text-red-500 transition-colors"
                onClick={handleLogout}
              >
                ログアウト
              </button>
            )}
          </div>
        </header>

        {/* === メインコンテンツエリア === */}
        <main className="space-y-6">
          {!token ? (
            // 未ログイン時: 認証フォームをカード形式で表示
            <div className="glass p-8 rounded-3xl">
              <AuthForm onAuthenticated={handleAuthenticated} />
            </div>
          ) : (
            <>
              {/* ログイン済: タスク追加フォーム */}
              <div className="glass p-6 rounded-3xl mb-8">
                <TodoForm onAdd={handleDataChange} />
              </div>

              {/* タスクリスト表示エリア */}
              <div className="glass rounded-3xl overflow-hidden min-h-[400px]">
                {isLoading ? (
                  // ローディング中: スケルトンを表示してガタつきを防止
                  <div className="p-8 space-y-4">
                    <TodoSkeleton />
                    <TodoSkeleton />
                    <TodoSkeleton />
                  </div>
                ) : todos.length === 0 ? (
                  // タスクが0件の場合のメッセージ: 達成感を促すデザイン
                  <div className="p-20 text-center">
                    <div className="text-5xl mb-4">✨</div>
                    <p className="text-lg font-medium text-slate-500 dark:text-slate-400">
                      すべてのタスクが完了しました！ゆっくり休みましょう。
                    </p>
                  </div>
                ) : (
                  // タスクがある場合: ドラッグ＆ドロップ可能なリストを表示
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="todos">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="p-4"
                        >
                          {todos.map((t, index) => (
                            <Draggable key={t.id} draggableId={t.id.toString()} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  // snapshot.isDragging: ドラッグ中のアイテムを強調(影を濃く、少し大きく)
                                  className={`mb-3 rounded-2xl transition-all ${
                                    snapshot.isDragging ? 'shadow-2xl scale-105 z-50' : ''
                                  }`}
                                >
                                  {/* 個々のタスクアイテムの背景 */}
                                  <div className="bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-white/20 dark:border-slate-700/50">
                                    <TodoItem todo={t} onChange={handleDataChange} />
                                  </div>
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
        </main>
      </div>
      
      {/* 通知用コンポーネント: カスタマイズしてデザインを統一 */}
      <Toaster 
        position="bottom-right"
        toastOptions={{
          className: 'dark:bg-slate-800 dark:text-white rounded-xl border border-white/10',
          duration: 3000,
        }}
      />
    </div>
  );
}


