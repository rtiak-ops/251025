import { useState } from 'react';
import { X, Building2, Globe, Hash, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { createOrganization } from '../../api';
import { toast } from 'react-hot-toast';
import axios from 'axios';

interface OrgRegistrationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * 組織（テナント）登録用モーダル
 * window.promptを置き換え、よりセキュアで体験の良い登録フローを提供します。
 */
export default function OrgRegistrationModal({ onClose, onSuccess }: OrgRegistrationModalProps) {
  const [name, setName] = useState('');
  const [corporateId, setCorporateId] = useState('');
  const [website, setWebsite] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("組織名は必須です");
      return;
    }

    setIsSubmitting(true);
    try {
      await createOrganization({
        name: name.trim(),
        corporate_id: corporateId.trim() || undefined,
        website: website.trim() || undefined
      });
      toast.success("組織を正常に登録しました。管理者権限が付与されました。");
      onSuccess();
      onClose();
    } catch (error: unknown) {
      console.error("組織作成エラー:", error);
      let message = "組織の登録に失敗しました";
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          message = "既にその名称または法人番号は登録されています";
        } else if (error.response?.data?.detail) {
          const d = error.response.data.detail;
          if (typeof d === 'string') {
            message = d;
          } else if (Array.isArray(d)) {
            const first = d[0] as { msg?: string } | undefined;
            message = first?.msg || JSON.stringify(d);
          } else {
            message = JSON.stringify(d);
          }
        }
      }
      
      toast.error(message);
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
          {/* 閉じるボタン */}
          <button 
            onClick={onClose}
            className="absolute right-6 top-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>

          {/* ヘッダー */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Building2 className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">組織の登録</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">法人利用を開始して、チーム管理を有効にします</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* 組織名 */}
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
                {/* 法人番号 */}
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

                {/* ウェブサイト */}
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

            {/* 補足情報 */}
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
              <div className="flex gap-3">
                <ShieldCheck className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" size={18} />
                <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                  組織を作成すると、あなたは自動的に<strong>管理者 (Admin)</strong> となり、
                  監査ログの閲覧やメンバーの招待、権限管理が可能になります。
                </p>
              </div>
            </div>

            {/* 送信ボタン */}
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
                className="flex-[2] py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    登録を完了する
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
