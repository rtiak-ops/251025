import type { Todo } from "../types.ts"; // Todoの型定義をインポート
import { updateTodo, deleteTodo } from "../api"; // API関数（更新と削除）をインポート

// コンポーネントのPropsの型定義
interface Props {
  todo: Todo; // 表示するTodoオブジェクト
  onChange: () => void; // Todoが更新または削除された後に親コンポーネントに再レンダリングを促すコールバック関数
}

/**
 * 個々のTodoアイテムを表示・操作するコンポーネント。
 */
export default function TodoItem({ todo, onChange }: Props) {
  // 完了状態をトグル（切り替え）する非同期関数
  const toggle = async () => {
    try {
      // APIを呼び出し、完了状態を反転させて更新
      await updateTodo(todo.id, { completed: !todo.completed });
      // 成功したら、親コンポーネントに通知してリストを更新
      onChange();
    } catch (error) {
      // ネットワークエラーやサーバーエラーが発生した場合の処理
      console.error("更新エラー:", error);
      // ユーザーに操作が失敗したことを通知
      alert("タスクの更新に失敗しました。時間をおいて再度お試しください。");
    }
  };

  // Todoを削除する非同期関数
  const remove = async () => {
    try {
      // APIを呼び出し、Todoアイテムを削除
      await deleteTodo(todo.id);
      // 成功したら、親コンポーネントに通知してリストを更新
      onChange();
    } catch (error) {
      // ネットワークエラーやサーバーエラーが発生した場合の処理（改善点）
      console.error("削除エラー:", error);
      // ユーザーに操作が失敗したことを通知
      alert("タスクの削除に失敗しました。時間をおいて再度お試しください。");
    }
  };

  // UIのレンダリング
  return (
    // Tailwind CSSでスタイリング：flexコンテナ、両端揃え、アイテム中央寄せ、パディング、下線
    <div className="flex justify-between items-center p-2 border-b">
      {/* Todoのタイトルとチェックボックスのエリア */}
      <label className="flex items-center gap-2">
        {/* チェックボックス：現在の完了状態を表示し、変更時にtoggle関数を実行 */}
        <input type="checkbox" checked={todo.completed} onChange={toggle} />
        {/* Todoのタイトル：完了している場合は打ち消し線と灰色テキストを適用 */}
        <span className={todo.completed ? "line-through text-gray-500" : ""}>
          {todo.title}
        </span>
      </label>

      {/* 削除ボタン：クリック時にremove関数を実行 */}
      <button
        onClick={remove}
        className="text-red-500 hover:text-red-700" // ホバー時のスタイルを追加
      >
        削除
      </button>
    </div>
  );
}
