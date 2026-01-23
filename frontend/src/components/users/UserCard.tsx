import type { User } from "../../types";
import { Shield, Trash2, Mail, ShieldAlert } from "lucide-react";

interface UserCardProps {
  user: User;
  isCurrentUser: boolean;
  onRoleChange: (userId: number, currentRole: User['role']) => void;
  onDelete: (userId: number) => void;
}

export default function UserCard({ user, isCurrentUser, onRoleChange, onDelete }: UserCardProps) {
  return (
    <div className="bg-white/50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black ${
          user.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
        }`}>
          {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onRoleChange(user.id, user.role)}
            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
            title="ロールを変更"
          >
            <Shield size={18} />
          </button>
          {!isCurrentUser && (
            <button 
              onClick={() => onDelete(user.id)}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              title="ユーザーを削除"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-slate-800 dark:text-white truncate">{user.full_name || '名称未設定'}</h4>
          {user.role === 'admin' && <ShieldAlert size={14} className="text-indigo-500" />}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-white/60">
          <Mail size={12} />
          <span className="truncate">{user.email}</span>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
          user.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
        }`}>
          {user.role}
        </span>
        <span className="text-[10px] text-slate-400 font-mono">ID: {user.id}</span>
      </div>
    </div>
  );
}
