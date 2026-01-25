import { useQuery } from "@tanstack/react-query";
import { getAuditLogs } from "../../api";
import { History, Search } from "lucide-react";
import { useState } from "react";

/**
 * 【監査ログビュー (AuditLogView)】
 * 組織内で行われた「誰が・いつ・何をしたか」という操作履歴を一覧表示する管理者用画面です。
 * データの作成、更新、削除などの重要なアクションを追跡し、セキュリティ監査やトラブルシューティングに役立てます。
 */
export default function AuditLogView() {
  // ユーザーが入力した検索キーワードの状態管理
  const [searchTerm, setSearchTerm] = useState("");

  // React Queryを使用してバックエンドから監査ログデータを取得
  // 自動的にキャッシュ管理やローディング状態のハンドリングが行われます。
  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => getAuditLogs(),
  });

  // クライアントサイドでのフィルタリング
  // アクション（CREATE/DELETE等）、リソース（TODO/PROJECT等）、実行ユーザーのメールアドレスで検索可能です。
  const filteredLogs = Array.isArray(logs) ? logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.user_email || "").toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
          <History className="text-indigo-600" size={32} />
          監査ログ
        </h2>
      </div>

      <div className="glass p-6 rounded-3xl">
        <div className="relative mb-6">
          <input 
            id="audit_search"
            name="audit_search"
            type="text" 
            placeholder="ログを検索 (アクション, リソース, ユーザー)..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 px-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium dark:text-white"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">日時</th>
                <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ユーザー</th>
                <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">アクション</th>
                <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">リソース</th>
                <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">詳細</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="py-6 px-4">
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-500 font-medium">
                    ログが見つかりませんでした。
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 dark:text-white">{log.user_email}</span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {log.user_id}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                        log.action.includes('DELETE') ? 'bg-red-100 text-red-600' :
                        log.action.includes('CREATE') ? 'bg-emerald-100 text-emerald-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                      {log.resource_type}
                    </td>
                    <td className="py-4 px-4">
                      <div className="max-w-xs truncate text-[10px] font-mono text-slate-400" title={JSON.stringify(log.details)}>
                        {JSON.stringify(log.details)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
