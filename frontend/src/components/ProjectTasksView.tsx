import { Folder, Edit3, Trash2 } from 'lucide-react';
import type { Todo, Project, ProjectSummary } from '../types';
import TodoItem from './TodoItem';
import TodoForm from './TodoForm';
import TodoSkeleton from './TodoSkeleton';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';

interface ProjectTasksViewProps {
  project?: Project | ProjectSummary;
  todos: Todo[];
  isLoading: boolean;
  onDataChange: () => void;
  onDragEnd: (result: DropResult) => void;
  onEditProject?: () => void;
  onDeleteProject?: () => void;
  activeFilter?: { label: string; priority?: Todo['priority']; status?: Todo['status']; completed?: boolean } | null;
  onClearFilter?: () => void;
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
  onDeleteProject,
  activeFilter,
  onClearFilter
}: ProjectTasksViewProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* プロジェクトヘッダー：左側に情報、右側に新規作成フォームを配置 */}
      <div className="glass p-8 rounded-3xl">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* 左側：プロジェクト情報 */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-6">
              <div className="p-4 rounded-3xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex-shrink-0">
                <Folder size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-3 flex-wrap">
                  {project ? project.name : 'すべてのタスク'}
                  {activeFilter && (
                    <span className="text-sm font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 flex items-center gap-2">
                      {activeFilter.label}
                      <button onClick={onClearFilter} className="hover:text-red-500 transition-colors">✕</button>
                    </span>
                  )}
                </h2>
                <p className="text-slate-500 dark:text-white font-medium">
                  {project?.description || (project ? '説明なし' : '全プロジェクトを横断して表示しています')}
                </p>
              </div>
            </div>

            {/* プロジェクト操作ボタン（タイトル付近に配置） */}
            {project && (
              <div className="flex items-center gap-3 pt-2">
                <button 
                  onClick={onEditProject}
                  className="px-4 py-2 bg-white/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700 transition-all text-slate-500 hover:text-indigo-600 flex items-center gap-2 text-sm font-bold"
                >
                  <Edit3 size={16} /> 編集
                </button>
                <button 
                  onClick={onDeleteProject}
                  className="px-4 py-2 bg-white/50 dark:bg-slate-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl border border-slate-200 dark:border-slate-700 transition-all text-slate-500 hover:text-red-500 flex items-center gap-2 text-sm font-bold"
                >
                  <Trash2 size={16} /> 削除
                </button>
              </div>
            )}
          </div>

          {/* 右側：タスク新規作成フォーム（区切り線を入れ、横に並べる） */}
          <div className="w-full lg:w-[480px] lg:pl-8 lg:border-l border-slate-200 dark:border-slate-700 mt-6 lg:mt-0">
            <TodoForm onAdd={onDataChange} initialProjectId={project?.id} />
          </div>
        </div>
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
            <p className="text-lg font-medium text-slate-500 dark:text-white">
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
        )}
      </div>
    </div>
  );
}
