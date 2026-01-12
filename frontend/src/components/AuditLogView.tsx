import { useQuery } from "@tanstack/react-query";
import { getAuditLogs } from "../api";
import type { AuditLog } from "../types";

export default function AuditLogView() {
    const { data: logs, isLoading } = useQuery<AuditLog[]>({
        queryKey: ["audit-logs"],
        queryFn: () => getAuditLogs(0, 50),
        refetchInterval: 10000, // 10秒おきに更新
    });

    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white">監査ログ</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">システム内で行われた全ての操作履歴を確認できます。</p>
                </div>
            </div>

            <div className="glass overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 dark:bg-white/5 text-slate-500 dark:text-slate-400 font-semibold text-sm">
                            <tr>
                                <th className="p-4">日時</th>
                                <th className="p-4">ユーザー</th>
                                <th className="p-4">操作</th>
                                <th className="p-4">対象</th>
                                <th className="p-4">詳細</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-white/10 dark:text-slate-200">
                            {logs?.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                    <td className="p-4 text-xs whitespace-nowrap">
                                        {formatDateTime(log.created_at)}
                                    </td>
                                    <td className="p-4 text-sm font-medium">
                                        {log.user_email || "System"}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            log.action === 'CREATE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                            log.action === 'DELETE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                        }`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                                        {log.resource_type} ({log.resource_id})
                                    </td>
                                    <td className="p-4 text-xs max-w-xs truncate" title={log.details || ""}>
                                        {log.details || "-"}
                                    </td>
                                </tr>
                            ))}
                            {logs?.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        ログがありません
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
