import { Folder, Edit3, Trash2, Users } from 'lucide-react';
import type { Project, ProjectSummary, Collaborator } from '../../../types';

interface ProjectHeaderProps {
  project?: Project | ProjectSummary;
  activeFilter?: { label: string } | null;
  onClearFilter?: () => void;
  isOwner: boolean;
  onEditProject?: () => void;
  onDeleteProject?: () => void;
  showMembers: boolean;
  setShowMembers: (show: boolean) => void;
}

/**
 * 【プロジェクトヘッダー (ProjectHeader)】
 * プロジェクトの「タイトル」「説明」「操作メニュー（編集・削除・メンバー管理）」を表示します。
 * フィルタが適用されている場合は、フィルタ解除用のバッジも表示します。
 */
export default function ProjectHeader({
  project,
  activeFilter,
  onClearFilter,
  isOwner,
  onEditProject,
  onDeleteProject,
  showMembers,
  setShowMembers,
}: ProjectHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      <div className="flex-1 space-y-4">
        <div className="flex items-center gap-6">
          {/* プロジェクトアイコン */}
          <div className="p-4 rounded-3xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex-shrink-0">
            <Folder size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-3 flex-wrap">
              {/* プロジェクト名（未選択時は「すべてのタスク」） */}
              {project ? project.name : 'すべてのタスク'}
              
              {/* アクティブな絞り込み条件（フィルタ）の表示 */}
              {activeFilter && (
                <span className="text-sm font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 flex items-center gap-2">
                  {activeFilter.label}
                  <button onClick={onClearFilter} className="hover:text-red-500 transition-colors" title="フィルタを解除">✕</button>
                </span>
              )}
            </h2>
            <p className="text-slate-500 dark:text-white font-medium">
              {project?.description || (project ? '説明なし' : '全プロジェクトを横断して表示しています')}
            </p>
          </div>
        </div>

        {/* 
            【操作アクション】
            プロジェクトが存在する場合に表示されるボタン群。
        */}
        {project && (
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {/* 編集・削除ボタンはプロジェクト所有者（オーナー）のみに表示 */}
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

            {/* 共同編集者（メンバー）表示の切り替えボタン */}
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
                {/* 
                    簡易的なメンバーアバター（イニシャル）のスタック表示。
                    現在のメンバー数を確認できる視覚的なヒントです。
                */}
                <div className="flex -space-x-2 ml-1">
                    <div className="w-6 h-6 rounded-full bg-indigo-500 border border-white dark:border-slate-800 flex items-center justify-center text-[8px] text-white font-bold" title="Owner">O</div>
                    {project && Array.isArray(project.collaborators) && project.collaborators.slice(0, 3).map((c: Collaborator) => (
                        <div key={c.id} className="w-6 h-6 rounded-full bg-slate-400 border border-white dark:border-slate-800 flex items-center justify-center text-[8px] text-white font-bold" title={c.user_email || 'Member'}>M</div>
                    ))}
                </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
