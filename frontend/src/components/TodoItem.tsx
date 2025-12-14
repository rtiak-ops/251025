import type { Todo } from "../types.ts";
import { updateTodo, deleteTodo } from "../api";

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
   * 完了状態をトグル（切り替え）する非同期関数
   * 
   * チェックボックスの変更イベント（onChange）でトリガーされます。
   * APIを呼び出してサーバー側のデータを更新し、成功後に親コンポーネントに通知します。
   */
  const toggle = async () => {
    try {
      // API呼び出し: 現在のcompleted状態を反転させて送信
      // 成功するまで待機 (await)
      await updateTodo(todo.id, { completed: !todo.completed });
      
      // 更新成功後、親コンポーネントのリスト更新処理を呼び出す
      onChange();
    } catch (error) {
      // エラーハンドリング
      // エラーメッセージを生成してアラート表示
      const errorMessage =
        error instanceof Error
          ? error.message
          : "タスクの更新に失敗しました。時間をおいて再度お試しください。";
      console.error("更新エラー:", errorMessage);
      alert(errorMessage);
    }
  };

  /**
   * Todoを削除する非同期関数
   * 
   * 削除ボタンのクリックイベントでトリガーされます。
   * APIを呼び出してデータを削除し、成功後に親コンポーネントに通知します。
   */
  const remove = async () => {
    try {
      // API呼び出し: IDを指定してTodoを削除
      await deleteTodo(todo.id);
      
      // 削除成功後、親コンポーネントのリスト更新処理を呼び出す
      onChange();
    } catch (error) {
      // エラーハンドリング
      const errorMessage =
        error instanceof Error
          ? error.message
          : "タスクの削除に失敗しました。時間をおいて再度お試しください。";
      console.error("削除エラー:", errorMessage);
      alert(errorMessage);
    }
  };

  return (
    // リストアイテムのコンテナ: Flexboxで左右配置、下線付き
    // 外側のdivにはパディングを設けず、内部のlabelやbuttonでパディングを確保することでクリック領域を最大化
    <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      {/* 
        左側: チェックボックスとタイトル 
        flex-1を指定して残りの領域全体を埋めるようにし、labelタグで囲むことで
        この領域内のどこをクリックしてもチェックボックスが反応するようにしています。
      */}
      <label className="flex-1 flex items-center gap-3 p-3 cursor-pointer text-gray-900 dark:text-gray-100">
        <input 
          type="checkbox" 
          checked={todo.completed} 
          onChange={toggle} 
          className="cursor-pointer size-5 text-blue-600 rounded focus:ring-blue-500" // サイズやスタイルを少し調整
        />
        
        {/* タイトル表示: 完了時は取り消し線(line-through)とグレー色を適用 */}
        <span
          className={
            todo.completed
              ? "line-through text-gray-500 dark:text-gray-400"
              : ""
          }
        >
          {todo.title}
        </span>
      </label>

      {/* 
        右側: 削除ボタン
        p-3を指定してクリック領域を確保
      */}
      <button
        onClick={remove}
        className="p-3 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
        title="削除"
      >
        削除
      </button>
    </div>
  );
}
