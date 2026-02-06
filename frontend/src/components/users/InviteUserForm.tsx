import { useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { assignUserToOrganization } from "../../api";

interface InviteUserFormProps {
  onSuccess: () => void;
}

/**
 * 【ユーザー追加フォーム (InviteUserForm)】
 * メールアドレスを入力して、組織に新しいメンバーを追加するためのフォームコンポーネントです。
 */
export default function InviteUserForm({ onSuccess }: InviteUserFormProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      await assignUserToOrganization(inviteEmail.trim());
      toast.success(`${inviteEmail} を組織に追加しました`);
      setInviteEmail("");
      onSuccess();
    } catch (error: unknown) {
      let msg = "追加に失敗しました。ユーザーが存在しないか、既に別の組織に所属している可能性があります。";
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        msg = error.response.data.detail;
      }
      toast.error(msg);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <form onSubmit={handleInvite} className="flex items-center gap-2">
      <div className="relative group">
        <input 
          type="email"
          placeholder="追加するメールアドレス..."
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          className="w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white text-sm"
          required
        />
      </div>
      <button 
        type="submit"
        disabled={isInviting || !inviteEmail.trim()}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 text-sm"
      >
        {isInviting ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
        追加
      </button>
    </form>
  );
}
