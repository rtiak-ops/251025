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
        className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl border border-white/20 overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-10">
          <button 
            onClick={onClose}
            className="absolute right-8 top-8 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={24} />
          </button>

          <div className="flex items-center gap-6 mb-12">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/40">
              <Building2 className="text-white" size={40} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">組織の設定</h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg">所属組織のプロファイルと高度な設定を管理します</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
              {/* 基本情報セクション */}
              <div className="md:col-span-2">
                <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-6">基本情報</h3>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Building2 size={12} />
                  組織名（会社名）<span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  placeholder="株式会社 ○○○"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white font-bold text-lg"
                  required
                />
              </div>

              <div className="space-y-2">
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
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white font-medium"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Globe size={12} />
                  公式ウェブサイト
                </label>
                <input 
                  type="url"
                  placeholder="https://example.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white font-medium"
                />
              </div>
            </div>

            <div className="flex gap-6 pt-6">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-5 px-8 rounded-3xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-lg"
              >
                キャンセル
              </button>
              <button 
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="flex-[2] py-5 px-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-3xl font-bold shadow-2xl shadow-indigo-500/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-xl"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <>
                    変更を保存する
                    <ArrowRight size={24} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* 危険な操作エリア */}
          <div className="mt-16 pt-10 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-black text-red-500 mb-6 flex items-center gap-2 uppercase tracking-[0.2em]">
              <ShieldAlert size={18} />
              Danger Zone
            </h3>
            <div className="p-8 bg-red-50/50 dark:bg-red-900/5 rounded-[32px] border border-red-100 dark:border-red-900/10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                <p className="text-lg font-bold text-slate-800 dark:text-white mb-1">組織の削除</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  組織に関連するすべてのプロジェクト、タスク、監査ログが永久に削除されます。<br/>
                  この操作は<strong>元に戻すことができません。</strong>
                </p>
              </div>
              <button 
                onClick={handleDelete}
                disabled={isSubmitting}
                className="w-full md:w-auto px-10 py-4 bg-white dark:bg-slate-900 border-2 border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-base font-black shadow-sm transition-all flex items-center justify-center gap-3 whitespace-nowrap"
              >
                <Trash2 size={20} />
                組織を永久に削除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
