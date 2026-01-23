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
 * プロジェクト詳細とタスク一覧を表示する画面のメイン
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
  const [showMembers, setShowMembers] = useState(false);
  const isOwner = (project as ProjectSummary)?.role === 'owner';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass p-8 rounded-3xl">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 space-y-4">
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

          <div className="w-full lg:w-[480px] lg:pl-8 lg:border-l border-slate-200 dark:border-slate-700 mt-6 lg:mt-0">
            <TodoForm onAdd={onDataChange} initialProjectId={project?.id} />
          </div>
        </div>
      </div>

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
