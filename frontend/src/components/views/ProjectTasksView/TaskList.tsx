import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import type { Todo } from '../../../types'; // types
import TodoItem from '../../todo/TodoItem.tsx';
import TodoSkeleton from '../../todo/TodoSkeleton.tsx';

interface TaskListProps {
  todos: Todo[];
  isLoading: boolean;
  onDragEnd: (result: DropResult) => void;
  onDataChange: () => void;
}

/**
 * 【タスクリスト (TaskList)】
 * 現在のコンテキスト（プロジェクト等）に基づいたタスクの一覧をレンダリングします。
 * `@hello-pangea/dnd` を使用しており、ユーザーがタスクをドラッグして並び順を直感的に変更できます。
 */
export default function TaskList({
  todos,
  isLoading,
  onDragEnd,
  onDataChange,
}: TaskListProps) {
  // 通信中の場合はスケルトンスクリーンを表示して待機時間を快適に
  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <TodoSkeleton />
        <TodoSkeleton />
        <TodoSkeleton />
      </div>
    );
  }

  // タスクがない場合の案内
  if (todos.length === 0) {
    return (
      <div className="p-20 text-center">
        <div className="text-5xl mb-4">✨</div>
        <p className="text-lg font-medium text-slate-500 dark:text-white">
          タスクはありません。
        </p>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="todos">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="p-4">
            {/* タスク一覧をループして、Draggableコンポーネントで包んで表示 */}
            {Array.isArray(todos) && todos.map((t, index) => (
              <Draggable key={t.id} draggableId={t.id.toString()} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    // ドラッグ中のみ、影を濃くして浮き上がらせる視覚効果
                    className={`mb-3 rounded-2xl transition-all ${
                      snapshot.isDragging ? 'shadow-2xl scale-105 z-50' : ''
                    }`}
                  >
                    <div className="bg-white/50 dark:bg-slate-800/80 rounded-2xl border-2 border-slate-200/60 dark:border-slate-600 shadow-sm">
                      {/* 個別のタスク情報の詳細表示と操作（完了チェックなど） */}
                      <TodoItem todo={t} onChange={onDataChange} />
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
  );
}
