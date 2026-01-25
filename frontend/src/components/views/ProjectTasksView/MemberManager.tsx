import { Users, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { searchUsers, addCollaborator, removeCollaborator } from '../../../api';
import type { Project, ProjectSummary, Collaborator, User } from '../../../types';

interface MemberManagerProps {
  project: Project | ProjectSummary;
  currentUser?: User;
  isOwner: boolean;
  onDataChange: () => void;
  onClose: () => void;
}

/**
 * メンバー情報の表示と招待を行うパネル
 */
export default function MemberManager({
  project,
  currentUser,
  isOwner,
  onDataChange,
  onClose,
}: MemberManagerProps) {
  const [inviteEmail, setInviteEmail] = useState("");

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("メールアドレスを入力してください");
      return;
    }
    
    try {
      const users = await searchUsers(inviteEmail);
      const user = users.find(u => u.email === inviteEmail);
      
      if (!user) {
        toast.error("ユーザーが見つかりません");
        return;
      }

      await addCollaborator(project.id, user.id, 'editor');
      toast.success(`${inviteEmail} を招待しました`);
      setInviteEmail("");
      onDataChange();
    } catch {
      toast.error("招待に失敗しました");
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!window.confirm("このメンバーをプロジェクトから削除しますか？")) return;

    try {
      await removeCollaborator(project.id, userId);
      toast.success("メンバーを削除しました");
      onDataChange();
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  return (
    <div className="mt-4 p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-bold text-slate-700 dark:text-white flex items-center gap-2">
          <Users size={18} className="text-indigo-600" />
          プロジェクトメンバー
        </h4>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xs font-bold">閉じる</button>
      </div>

      <div className="space-y-3">
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

        {Array.isArray(project.collaborators) && project.collaborators.map((c: Collaborator) => {
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

      {isOwner && (
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">
            招待する
          </label>
          <div className="flex items-center gap-2">
              <input 
                  id="invite_email"
                  name="invite_email"
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
  );
}
