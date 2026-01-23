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
 * タスク一覧のリスト（ドラッグ＆ドロップ対応）
 */
export default function TaskList({
  todos,
  isLoading,
  onDragEnd,
  onDataChange,
}: TaskListProps) {
  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <TodoSkeleton />
        <TodoSkeleton />
        <TodoSkeleton />
      </div>
    );
  }

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
            {Array.isArray(todos) && todos.map((t, index) => (
              <Draggable key={t.id} draggableId={t.id.toString()} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`mb-3 rounded-2xl transition-all ${
                      snapshot.isDragging ? 'shadow-2xl scale-105 z-50' : ''
                    }`}
                  >
                    <div className="bg-white/50 dark:bg-slate-800/80 rounded-2xl border-2 border-slate-200/60 dark:border-slate-600 shadow-sm">
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
