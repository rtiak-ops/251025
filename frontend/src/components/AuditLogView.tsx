import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuditLogs } from "../api";
import type { AuditLog } from "../types";

export default function AuditLogView() {
    const [searchQuery, setSearchQuery] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [action, setAction] = useState("");
    const [resourceType, setResourceType] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const { data: logs, isLoading, isError } = useQuery<AuditLog[] | any>({
        queryKey: ["audit-logs", searchQuery, userEmail, action, resourceType, startDate, endDate],
        queryFn: async () => {
            const data = await getAuditLogs(0, 50, {
                query: searchQuery || undefined,
                user_email: userEmail || undefined,
                action: action || undefined,
                resource_type: resourceType || undefined,
                start_date: startDate ? new Date(startDate).toISOString() : undefined,
                end_date: endDate ? new Date(endDate).toISOString() : undefined
            });
            return Array.isArray(data) ? data : [];
        },
        refetchInterval: 10000, // 10秒おきに更新
    });

    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "-";
        return date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    /**
     * 日本語へのマッピング
     */
    const actionNames: Record<string, string> = {
        'CREATE': '作成',
        'UPDATE': '更新',
        'DELETE': '削除',
        'LOGIN': 'ログイン',
        'UPDATE_ROLE': '権限変更',
        'ADD_TO_ORG': '組織追加',
    };

    const resourceNames: Record<string, string> = {
        'TODO': 'タスク',
        'PROJECT': 'プロジェクト',
        'USER': 'ユーザー',
        'ORGANIZATION': '組織',
    };

    /**
     * 監査ログの詳細を日本語で分かりやすく説明する
     */
    const renderLogDescription = (log: AuditLog) => {
        const { action, resource_type, details } = log;
        let detailObj: any = {};
        
        try {
            if (details) {
                detailObj = typeof details === 'string' ? JSON.parse(details) : details;
            }
        } catch (e) {
            // 文字列の場合もあるので無視
        }

        const subject = resourceNames[resource_type] || resource_type;

        switch (action) {
            case 'CREATE':
                if (detailObj.title || detailObj.name) {
                    return `新しい${subject}「${detailObj.title || detailObj.name}」を作成しました`;
                }
                return `新しい${subject}を作成しました`;
            
            case 'UPDATE': {
                const changes = [];
                if (detailObj.title) changes.push(`タイトルを「${detailObj.title}」に変更`);
                if (detailObj.name) changes.push(`名称を「${detailObj.name}」に変更`);
                if (detailObj.completed !== undefined) {
                    changes.push(detailObj.completed ? '「完了」に更新' : '「未完了」に戻しました');
                }
                if (detailObj.status) {
                    const statusNames: any = { 'TODO': '未着手', 'IN_PROGRESS': '進行中', 'REVIEW': 'レビュー中', 'DONE': '完了' };
                    changes.push(`ステータスを「${statusNames[detailObj.status] || detailObj.status}」に変更`);
                }
                if (detailObj.priority) {
                    const priorityNames: any = { 'LOW': '低', 'MEDIUM': '中', 'HIGH': '高', 'URGENT': '緊急' };
                    changes.push(`優先度を「${priorityNames[detailObj.priority] || detailObj.priority}」に変更`);
                }
                return changes.length > 0 ? `${subject}の${changes.join('、')}` : `${subject}の情報を更新しました`;
            }
            
            case 'DELETE':
                return `${subject}を削除しました`;
            
            case 'UPDATE_ROLE':
                return `ユーザーの権限を${detailObj.role || '変更'}しました (${details})`;

            case 'ADD_TO_ORG':
                return `組織に新しいメンバーを追加しました`;

            default:
                return details || `${subject}に対して${actionNames[action] || action}操作を行いました`;
        }
    };

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="text-red-500 text-4xl">⚠️</div>
                <div className="text-slate-600 dark:text-slate-300 font-medium text-center">
                    監査ログを取得できませんでした。<br />
                    管理者権限がないか、サーバーに接続できません。
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white">監査ログ</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">システム内で行われた全ての操作履歴を確認できます。</p>
                </div>
            </div>

            {/* フィルターセクション */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 glass rounded-2xl border border-slate-200 dark:border-white/10">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">開始日</label>
                    <input 
                        type="datetime-local" 
                        className="w-full bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">終了日</label>
                    <input 
                        type="datetime-local" 
                        className="w-full bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
                
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ユーザー</label>
                    <input 
                        type="email" 
                        placeholder="メール..." 
                        className="w-full bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">操作</label>
                    <select 
                        className="w-full bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                    >
                        <option value="">全ての操作</option>
                        {Object.entries(actionNames).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">対象</label>
                    <select 
                        className="w-full bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        value={resourceType}
                        onChange={(e) => setResourceType(e.target.value)}
                    >
                        <option value="">全ての対象</option>
                        {Object.entries(resourceNames).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">キーワード</label>
                    <input 
                        type="text" 
                        placeholder="詳細..." 
                        className="w-full bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
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
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center">
                                        <div className="flex justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : Array.isArray(logs) && logs.length > 0 ? logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                    <td className="p-4 text-xs whitespace-nowrap">
                                        {formatDateTime(log.created_at)}
                                    </td>
                                    <td className="p-4 text-sm font-medium">
                                        {log.user_email || "System"}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                                            log.action === 'CREATE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                            log.action === 'DELETE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                        }`}>
                                            {actionNames[log.action] || log.action}
                                        </span>
                                    </td>
                                    <td className="p-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                                        <div className="flex flex-col">
                                            <span>{resourceNames[log.resource_type] || log.resource_type}</span>
                                            <span className="text-[10px] text-slate-400 opacity-70">ID: {log.resource_id}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs max-w-xs truncate" title={log.details || ""}>
                                        {renderLogDescription(log)}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        条件に一致するログがありません
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
