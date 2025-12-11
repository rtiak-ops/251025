// Todoアイテムの構造を定義するインターフェース
// id、title、completedは必須、descriptionはオプション（?付き）
export interface Todo {
    id: number;       // Todoを一意に識別するためのID (必須)
    title: string;    // Todoのタイトル (必須)
    description?: string; // Todoの詳細な説明 (オプション: ある場合のみ)
    completed: boolean; // Todoが完了しているかどうかを示すフラグ (必須)
}

// 💡 新しいTo-Doを作成するためのデータ構造
export interface CreateTodoData {
    title: string;
    description?: string;
  }

// 💡 To-Doを更新するためのデータ構造 (全てオプション)
export type UpdateTodoData = Partial<Omit<Todo, 'id'>>;