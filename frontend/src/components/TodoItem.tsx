import type { Todo } from "../types.ts";
import { updateTodo, deleteTodo } from "../api";
import { toast } from "react-hot-toast";


/**
 * Propsインターフェース定義
 * コンポーネントが受け取るデータの型を定義します。
 */
interface Props {
  /** 表示するTodoアイテムのデータオブジェクト */
  todo: Todo;
  /** 
   * Todoの状態が変更された（更新または削除）際に呼び出されるコールバック関数。
   * 親コンポーネントはこの関数を受け取ったら、Todoリストを再取得（リフレッシュ）して
   * UIを最新の状態に更新する必要があります。
   */
  onChange: () => void;
}

/**
 * TodoItem コンポーネント
 * 
 * リスト内の個々のTodoアイテムを表示し、操作するためのコンポーネントです。
 * 
 * 主な機能:
 * 1. 【完了切り替え】: チェックボックスをクリックすると完了状態をAPI経由で更新します。
 * 2. 【削除】: 削除ボタンをクリックするとTodoをAPI経由で削除します。
 * 3. 【表示】: タイトルを表示し、完了済みの場合は取り消し線を表示します。
 */
export default function TodoItem({ todo, onChange }: Props) {
  
  /**
   * 完了状態の切り替え
   */
  const toggle = async () => {
    try {
      await updateTodo(todo.id, { completed: !todo.completed });
      onChange();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "更新に失敗しました";
      console.error("更新エラー:", errorMessage);
      toast.error(errorMessage);
    }
  };

  /**
   * タスクの削除
   */
  const remove = async () => {
    try {
      await deleteTodo(todo.id);
      onChange();
      toast.success("削除しました");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "削除に失敗しました";
      console.error("削除エラー:", errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    // groupクラス: 子要素のhover状態を親から制御するため（削除ボタンの表示に利用）
    <div className="flex justify-between items-center group">
      {/* 
        左側: チェックボックスとタイトル
        クリック領域を広げるために全体をlabelで囲んでいます。
      */}
      <label className="flex-1 flex items-center gap-4 p-4 cursor-pointer">
        <input 
          type="checkbox" 
          checked={todo.completed} 
          onChange={toggle} 
          // index.cssで定義したカスタムチェックボックススタイルが適用されます
          className="focus:ring-offset-2 focus:ring-indigo-500"
        />
        
        <div className="flex flex-col">
          <span
            className={`text-lg font-semibold transition-all duration-300 ${
              todo.completed
                ? "line-through text-slate-400 dark:text-slate-500" // 完了時は打ち消し線とグレーダウン
                : "text-slate-700 dark:text-slate-200"
            }`}
          >
            {todo.title}
          </span>
          {/* 説明文がある場合のみ表示（一考の余地あり） */}
          {todo.description && (
            <span className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1">
              {todo.description}
            </span>
          )}
        </div>
      </label>

      {/* 
        右側: 削除ボタン
        opacity-0 group-hover:opacity-100: 通常は隠しておき、マウスホバー時のみ表示してUIをスッキリさせます。
      */}
      <button
        onClick={remove}
        className="mr-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
        title="タスクを削除"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 12m-4.72 0-.34-12M4.5 6.375h15m-15 0A2.25 2.25 0 0 1 6.75 4.125h10.5a2.25 2.25 0 0 1 2.25 2.25v.375m-15 0a2.25 2.25 0 0 0 1.5 2.126V19.5A2.25 2.25 0 0 0 8.25 21.75h7.5a2.25 2.25 0 0 0 2.25-2.25V8.501a2.25 2.25 0 0 0 1.5-2.126m-15 0a2.25 2.25 0 0 0 1.5-2.126" />
        </svg>
      </button>
    </div>
  );
}
