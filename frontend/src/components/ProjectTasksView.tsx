import { Folder, Edit3, Trash2, Users, UserPlus } from 'lucide-react';
import type { Todo, Project, ProjectSummary, Collaborator, User } from '../types';
import { addCollaborator, searchUsers, removeCollaborator } from '../api';
import { toast } from 'react-hot-toast';
import { useState } from 'react';
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
  currentUser?: User;
}

/**
 * 【プロジェクト＆タスク一覧ビュー】
 * 特定のプロジェクトに所属するタスク、または全タスクを一覧表示するメインコンポーネントです。
 * ドラッグ＆ドロップによる並び替え、メンバーの招待・削除、プロジェクトの編集・削除などの機能を持ちます。
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
  // 招待するユーザーのメールアドレス入力状態
  const [inviteEmail, setInviteEmail] = useState("");
  // メンバー管理パネルの表示/非表示状態
  const [showMembers, setShowMembers] = useState(false);

  /**
   * メンバーをプロジェクトに招待するハンドラ
   */
  const handleInvite = async () => {
    if (!project) return;
    if (!inviteEmail.trim()) {
      toast.error("メールアドレスを入力してください");
      return;
    }
    
    try {
      // 1. 入力されたメールアドレスでユーザーを検索
      const users = await searchUsers(inviteEmail);
      const user = users.find(u => u.email === inviteEmail);
      
      if (!user) {
        toast.error("ユーザーが見つかりません");
        return;
      }

      // 2. 見つかったユーザーをコラボレーターとして追加
      await addCollaborator(project.id, user.id, 'editor');
      toast.success(`${inviteEmail} を招待しました`);
      setInviteEmail("");
      onDataChange(); // 親コンポーネントに通知してリストを更新
    } catch {
      toast.error("招待に失敗しました");
    }
  };

  /**
   * メンバーをプロジェクトから削除するハンドラ
   */
  const handleRemoveMember = async (userId: number) => {
    if (!project) return;
    if (!window.confirm("このメンバーをプロジェクトから削除しますか？")) return;

    try {
      await removeCollaborator(project.id, userId);
      toast.success("メンバーを削除しました");
      onDataChange();
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  // 現在のユーザーがこのプロジェクトのオーナーかどうかを判定
  const isOwner = (project as ProjectSummary)?.role === 'owner';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* プロジェクト詳細・操作セクション */}
      <div className="glass p-8 rounded-3xl">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-6">
              <div className="p-4 rounded-3xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex-shrink-0">
                <Folder size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-3 flex-wrap">
                  {project ? project.name : 'すべてのタスク'}
                  {/* アフィティブなフィルタ（ダッシュボード等から遷移時）がある場合に表示 */}
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

            {project && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {/* オーナー権限がある場合のみ、編集・削除ボタンを表示 */}
                {isOwner && (
                  <>
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
                  </>
                )}

                {/* メンバー管理トグルボタン */}
                <button 
                  onClick={() => setShowMembers(!showMembers)}
                  className={`flex items-center gap-2 ml-4 px-4 py-2 rounded-xl border transition-all ${
                    showMembers 
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg' 
                      : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-100'
                  }`}
                >
                    <Users size={16} />
                    <span className="text-xs font-bold">メンバー管理</span>
                    {/* メンバーのアイコンスタック */}
                    <div className="flex -space-x-2 ml-1">
                        <div className="w-6 h-6 rounded-full bg-indigo-500 border border-white dark:border-slate-800 flex items-center justify-center text-[8px] text-white font-bold" title="Owner">O</div>
                        {project && Array.isArray(project.collaborators) && project.collaborators.slice(0, 3).map((c: Collaborator) => (
                            <div key={c.id} className="w-6 h-6 rounded-full bg-slate-400 border border-white dark:border-slate-800 flex items-center justify-center text-[8px] text-white font-bold" title={c.user_email || 'Member'}>M</div>
                        ))}
                    </div>
                </button>
              </div>
            )}

            {/* 展開されるメンバー管理パネル */}
            {project && showMembers && (
              <div className="mt-4 p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-white flex items-center gap-2">
                    <Users size={18} className="text-indigo-600" />
                    プロジェクトメンバー
                  </h4>
                  <button onClick={() => setShowMembers(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">閉じる</button>
                </div>

                <div className="space-y-3">
                  {/* オーナーの表示 */}
                  <div className="flex items-center justify-between p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white font-bold">O</div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 font-mono">
                          {isOwner ? 'Owner (You)' : 'Project Owner'}
                        </span>
                        <span className="text-[10px] text-indigo-500 uppercase tracking-tighter">プロジェクト所有者</span>
                      </div>
                    </div>
                  </div>

                  {/* コラボレーターのリスト */}
                  {project && Array.isArray(project.collaborators) && project.collaborators.map((c: Collaborator) => {
                    const isMe = currentUser?.id === c.user_id;
                    return (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${isMe ? 'bg-indigo-500' : 'bg-slate-400'} flex items-center justify-center text-[10px] text-white font-bold`}>M</div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700 dark:text-white font-mono">
                              {c.user_email || `User ID: ${c.user_id}`}
                              {isMe && ' (You)'}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-tighter">{c.permission}</span>
                          </div>
                        </div>
                        
                        {/* 自分がオーナー（かつ削除対象が自分以外）の場合のみ削除ボタンを表示 */}
                        {isOwner && !isMe && (
                          <button 
                            onClick={() => handleRemoveMember(c.user_id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                            title="メンバーを削除"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* メンバー招待フォーム (管理パネル内) */}
                {isOwner && (
                  <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">
                      招待する
                    </label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="email" 
                            placeholder="メールアドレスを入力..." 
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                        />
                        <button 
                            onClick={handleInvite}
                            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg transition-all flex items-center gap-2 text-xs font-bold"
                        >
                            <UserPlus size={18} />
                            招待
                        </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="w-full lg:w-[480px] lg:pl-8 lg:border-l border-slate-200 dark:border-slate-700 mt-6 lg:mt-0">
            <TodoForm onAdd={onDataChange} initialProjectId={project?.id} />
          </div>
        </div>
      </div>

      <div className="glass rounded-3xl overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="p-8 space-y-4">
            <TodoSkeleton />
            <TodoSkeleton />
            <TodoSkeleton />
          </div>
        ) : todos.length === 0 ? (
          <div className="p-20 text-center">
            <div className="text-5xl mb-4">✨</div>
            <p className="text-lg font-medium text-slate-500 dark:text-white">
              タスクはありません。
            </p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
