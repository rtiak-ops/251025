import { useState, useEffect } from 'react';
import { X, Building2, Globe, Hash, ShieldAlert, ArrowRight, Loader2, Trash2 } from 'lucide-react';
import { updateOrganization, deleteOrganization } from '../../api';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import type { Organization } from '../../types';

interface OrgSettingsModalProps {
  organization: Organization;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * 組織（テナント）設定用モーダル
 * 組織情報の編集と削除機能を提供します。
 */
export default function OrgSettingsModal({ organization, onClose, onSuccess }: OrgSettingsModalProps) {
  const [name, setName] = useState(organization.name);
  const [corporateId, setCorporateId] = useState(organization.corporate_id || '');
  const [website, setWebsite] = useState(organization.website || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(organization.name);
    setCorporateId(organization.corporate_id || '');
    setWebsite(organization.website || '');
  }, [organization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("組織名は必須です");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateOrganization({
        name: name.trim(),
        corporate_id: corporateId.trim() || undefined,
        website: website.trim() || undefined
      });
      toast.success("組織情報を更新しました");
      onSuccess();
      onClose();
    } catch (error: unknown) {
      console.error("組織更新エラー:", error);
      let message = "組織の更新に失敗しました";
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        message = typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : JSON.stringify(error.response.data.detail);
      }
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("本当にこの組織を削除しますか？紐付いているプロジェクトやデータもすべて削除されます。この操作は取り消せません。")) {
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteOrganization();
      toast.success("組織を削除しました。アカウントは一般ユーザーにリセットされました。");
      onSuccess();
      onClose();
    } catch (error: unknown) {
      console.error("組織削除エラー:", error);
      toast.error("組織の削除に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-white/20 overflow-y-auto max-h-full animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-8">
          <button 
            onClick={onClose}
            className="absolute right-6 top-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Building2 className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">組織の設定</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">所属組織の情報を管理します</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Building2 size={12} />
                  組織名（会社名）<span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  placeholder="株式会社 ○○○"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Hash size={12} />
                    法人番号 (13桁)
                  </label>
                  <input 
                    type="text"
                    maxLength={13}
                    placeholder="1234567890123"
                    value={corporateId}
                    onChange={(e) => setCorporateId(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white font-medium text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Globe size={12} />
                    ウェブサイト
                  </label>
                  <input 
                    type="url"
                    placeholder="https://example.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white font-medium text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-4 px-6 rounded-2xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                キャンセル
              </button>
              <button 
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="flex-[2] py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    変更を保存する
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* 危険な操作エリア */}
          <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-red-500 mb-4 flex items-center gap-2">
              <ShieldAlert size={16} />
              危険な操作
            </h3>
            <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">組織の削除</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">組織内のすべてのデータを削除して退会します</p>
              </div>
              <button 
                onClick={handleDelete}
                disabled={isSubmitting}
                className="w-full md:w-auto px-6 py-2.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                組織を削除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
