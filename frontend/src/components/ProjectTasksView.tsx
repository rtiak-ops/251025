import { Folder, Edit3, Trash2 } from 'lucide-react';
import type { Todo, Project } from '../types';
import TodoItem from './TodoItem';
import TodoForm from './TodoForm';
import TodoSkeleton from './TodoSkeleton';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';

interface ProjectTasksViewProps {
  project?: Project;
  todos: Todo[];
  isLoading: boolean;
  onDataChange: () => void;
  onDragEnd: (result: DropResult) => void;
  onEditProject?: () => void;
  onDeleteProject?: () => void;
}

/**
 * ProjectTasksView.tsx
 * 特定のプロジェクトに属するタスク一覧、または「全タスク」一覧を表示するコンポーネント。
 */
export default function ProjectTasksView({
  project,
  todos,
  isLoading,
  onDataChange,
  onDragEnd,
  onEditProject,
  onDeleteProject
}: ProjectTasksViewProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* プロジェクトヘッダー：プロジェクト名と説明を表示 */}
      <div className="glass p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="p-4 rounded-3xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600">
            <Folder size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-1">
              {project ? project.name : 'すべてのタスク'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {project?.description || (project ? '説明なし' : '全プロジェクトを横断して表示しています')}
            </p>
          </div>
        </div>

        {/* 特定プロジェクト表示時のみ、編集・削除ボタンを表示 */}
        {project && (
          <div className="flex items-center gap-3">
            <button 
              onClick={onEditProject}
              className="p-3 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-2xl transition-all text-slate-500 hover:text-indigo-600"
              title="プロジェクトを編集"
            >
              <Edit3 size={20} />
            </button>
            <button 
              onClick={onDeleteProject}
              className="p-3 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-2xl transition-all text-slate-500 hover:text-red-500"
              title="プロジェクトを削除"
            >
              <Trash2 size={20} />
            </button>
          </div>
        )}
      </div>

      {/* タスク新規作成フォーム */}
      <div className="glass p-6 rounded-3xl">
        {/* initialProjectId を渡すことで、特定のプロジェクト配下に即座にタスクを追加可能 */}
        <TodoForm onAdd={onDataChange} initialProjectId={project?.id} />
      </div>

      {/* タスクリスト表示エリア */}
      <div className="glass rounded-3xl overflow-hidden min-h-[400px]">
        {isLoading ? (
          // ロード中：スケルトンUIを表示
          <div className="p-8 space-y-4">
            <TodoSkeleton />
            <TodoSkeleton />
            <TodoSkeleton />
          </div>
        ) : todos.length === 0 ? (
          // 空状態：メッセージを表示
          <div className="p-20 text-center">
            <div className="text-5xl mb-4">✨</div>
            <p className="text-lg font-medium text-slate-500 dark:text-slate-400">
              このプロジェクトにタスクはありません。
            </p>
          </div>
        ) : (
          // タスクあり：ドラッグ&ドロップ可能なリストを構成
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="todos">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="p-4">
                  {todos.map((t, index) => (
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
                          {/* 個別のタスクカード */}
                          <div className="bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-white/20 dark:border-slate-700/50">
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
        )}
      </div>
    </div>
  );
}
