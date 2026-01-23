import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { type DropResult } from "@hello-pangea/dnd";
import { getTodos, reorderTodos } from "../api";
import type { Todo } from "../types";

export type Filter = {
  label: string;
  priority?: Todo['priority'];
  status?: Todo['status'];
  completed?: boolean;
};

export function useTodos(token: string | null, searchQuery: string, currentView: any, activeFilter: Filter | null) {
  const queryClient = useQueryClient();

  const { data: todosData, isLoading: isTodosLoading } = useQuery<Todo[]>({
    queryKey: ["todos", searchQuery],
    queryFn: () => getTodos(searchQuery),
    enabled: !!token,
  });

  const allTodos = Array.isArray(todosData) ? todosData : [];

  const reorderMutation = useMutation({
    mutationFn: (newOrderIds: number[]) => reorderTodos(newOrderIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
    onError: () => {
      toast.error("並び替えに失敗しました");
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    }
  });

  const filteredTodos = allTodos.filter(t => {
    const matchesView = 
      currentView === 'all' || 
      currentView === 'dashboard' || 
      currentView === 'audit' || 
      currentView === 'monitor' || 
      currentView === 'users' || 
      t.project_id === currentView;
    
    if (!matchesView) return false;

    if (activeFilter) {
      if (activeFilter.priority && t.priority !== activeFilter.priority) return false;
      if (activeFilter.status && t.status !== activeFilter.status) return false;
      if (activeFilter.completed !== undefined && t.completed !== activeFilter.completed) return false;
    }

    if (searchQuery && 
        !t.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !t.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
    }

    return true;
  });

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(filteredTodos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    try {
        const newOrderIds = items.map(t => t.id);
        reorderMutation.mutate(newOrderIds);
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
