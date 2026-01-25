import { useState } from 'react';
import type { Todo, Project, ProjectSummary, User } from '../../../types';
import type { DropResult } from '@hello-pangea/dnd';
import TodoForm from '../../todo/TodoForm.tsx';
import ProjectHeader from './ProjectHeader';
import MemberManager from './MemberManager';
import TaskList from './TaskList';

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
  currentUser?: User;
}

/**
 * 【プロジェクト詳細 & タスク一覧ビュー (ProjectTasksView)】
 * 特定のプロジェクト、または「すべてのタスク」を表示するための複合ビューです。
 * ヘッダー、メンバー管理パネル、タスク入力フォーム、そしてドラッグ＆ドロップ可能なタスクリストを統合しています。
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
  onClearFilter,
  currentUser
}: ProjectTasksViewProps) {
  // メンバー管理パネルを表示するかどうかのフラグ
  const [showMembers, setShowMembers] = useState(false);
  
  // 現在のユーザーがこのプロジェクトの所有者（オーナー）かどうかを判定し、
  // 編集やメンバー招待などの権限を制御します。
  const isOwner = (project as ProjectSummary)?.role === 'owner';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 
          【上部コントロールエリア】
          プロジェクトの基本情報表示、操作ボタン、およびタスク入力フォーム。
      */}
      <div className="glass p-8 rounded-3xl">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 space-y-4">
            {/* プロジェクトのタイトルや説明を表示するヘッダーコンポーネント */}
            <ProjectHeader 
              project={project}
              activeFilter={activeFilter}
              onClearFilter={onClearFilter}
              isOwner={isOwner}
              onEditProject={onEditProject}
              onDeleteProject={onDeleteProject}
              showMembers={showMembers}
              setShowMembers={setShowMembers}
            />

            {/* メンバー管理パネル: ボタン押下時のみ表示 */}
            {project && showMembers && (
              <MemberManager 
                project={project}
                currentUser={currentUser}
                isOwner={isOwner}
                onDataChange={onDataChange}
                onClose={() => setShowMembers(false)}
              />
            )}
          </div>

          {/* 右側（PC）または下部（スマホ）のタスククイック作成フォーム */}
          <div className="w-full lg:w-[480px] lg:pl-8 lg:border-l border-slate-200 dark:border-slate-700 mt-6 lg:mt-0">
            <TodoForm onAdd={onDataChange} initialProjectId={project?.id} />
          </div>
        </div>
      </div>

      {/* 
          【タスクリストエリア】
          メインのタスク一覧。ドラッグによる並び替えに対応。
      */}
      <div className="glass rounded-3xl overflow-hidden min-h-[400px]">
        <TaskList 
          todos={todos}
          isLoading={isLoading}
          onDragEnd={onDragEnd}
          onDataChange={onDataChange}
        />
      </div>
    </div>
  );
}
