import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { type DropResult } from "@hello-pangea/dnd";
import { getTodos, reorderTodos } from "../api";
import type { Todo } from "../types";

/**
 * タスクの絞り込み条件（フィルタ）の型定義
 */
export type Filter = {
  label: string;
  priority?: Todo['priority'];
  status?: Todo['status'];
  completed?: boolean;
};

/**
 * 【タスク管理フック (useTodos)】
 * 全タスクの取得、現在のViewや検索・フィルタに応じた絞り込み、
 * およびドラッグ&ドロップによる並び順の更新ロジックを担当します。
 */
export function useTodos(token: string | null, searchQuery: string, currentView: string | number, activeFilter: Filter | null) {
  const queryClient = useQueryClient();

  // --- 全タスクデータの取得 ---
  // 検索ワードが変更されるたびに自動的に再取得（またはキャッシュから読込）されます
  const { data: todosData, isLoading: isTodosLoading } = useQuery<Todo[]>({
    queryKey: ["todos", searchQuery],
    queryFn: () => getTodos(searchQuery),
    enabled: !!token, // ログイン中のみ実行
  });

  const allTodos = Array.isArray(todosData) ? todosData : [];

  // --- 並び順更新（Reorder）のアクション ---
  const reorderMutation = useMutation({
    mutationFn: (newOrderIds: number[]) => reorderTodos(newOrderIds),
    onSuccess: () => {
      // 更新が成功したらタスク一覧のキャッシュを無効化して再取得を促す
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
    onError: () => {
      toast.error("並び替えに失敗しました");
      // エラー時も整合性を保つためキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    }
  });

  // --- タスクのフィルタリングロジック（算出プロパティ） ---
  const filteredTodos = allTodos.filter(t => {
    // 1. 現在のView（プロジェクト）と一致するか
    const matchesView = 
      currentView === 'all' || 
      currentView === 'dashboard' || 
      currentView === 'audit' || 
      currentView === 'monitor' || 
      currentView === 'users' || 
      t.project_id === currentView;
    
    if (!matchesView) return false;

    // 2. アクティブなフィルタ（重要度、ステータス等）と一致するか
    if (activeFilter) {
      if (activeFilter.priority && t.priority !== activeFilter.priority) return false;
      if (activeFilter.status && t.status !== activeFilter.status) return false;
      if (activeFilter.completed !== undefined && t.completed !== activeFilter.completed) return false;
    }

    // 3. 検索キーワード（タイトルまたは説明に含まれるか）と一致するか
    if (searchQuery && 
        !t.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !t.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
    }

    return true;
  });

  /**
   * ドラッグ&ドロップ完了時の処理
   * リスト内の順序を入れ替え、サーバーへ新しいID順序を保存します。
   */
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return; // 枠外にドロップされた場合

    const items = Array.from(filteredTodos);
    // 元の場所から削除し、新しい場所へ挿入
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    try {
        const newOrderIds = items.map(t => t.id);
        reorderMutation.mutate(newOrderIds); // 非同期でサーバーに通知
    } catch (e) {
        console.error("並び替えエラー:", e);
    }
  };

  return {
    allTodos,
    filteredTodos,
    isTodosLoading,
    handleDragEnd
  };
}
