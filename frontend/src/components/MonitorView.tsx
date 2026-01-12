import { useQuery } from "@tanstack/react-query";
import { getHealth, getSystemStats } from "../api";
import { Activity, Server, Database, Globe, Users, FolderKanban, ListChecks, History } from "lucide-react";
import type { HealthStatus, SystemStats } from "../types";

export default function MonitorView() {
    const { data: health, isLoading: isHealthLoading } = useQuery<HealthStatus>({
        queryKey: ["health"],
        queryFn: getHealth,
        refetchInterval: 5000,
    });

    const { data: stats, isLoading: isStatsLoading } = useQuery<SystemStats>({
        queryKey: ["system-stats"],
        queryFn: getSystemStats,
        refetchInterval: 30000,
    });

    if (isHealthLoading || isStatsLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    const StatCard = ({ icon: Icon, label, value, colorClass }: any) => (
        <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${colorClass}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
                <p className="text-2xl font-bold dark:text-white">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                    <Activity className="text-indigo-500" /> システムモニタリング
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">リアルタイムのシステム稼働状況とパフォーマンス指標</p>
            </div>

            {/* Health Status Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-white/10">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <Server size={16} /> API Status
                        </span>
                        <span className={`w-3 h-3 rounded-full animate-pulse ${health?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    </div>
                    <p className="text-xl font-bold dark:text-white uppercase">{health?.status || 'Unknown'}</p>
                </div>

                <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-white/10">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <Database size={16} /> DB Latency
                        </span>
                    </div>
                    <p className="text-xl font-bold dark:text-white">{health?.database.latency_sec ? `${(health.database.latency_sec * 1000).toFixed(1)}ms` : '-'}</p>
                    <p className="text-[10px] text-green-500 mt-1">Excellent Performance</p>
                </div>

                <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-white/10">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <Globe size={16} /> Environment
                        </span>
                    </div>
                    <p className="text-xl font-bold dark:text-white uppercase">{health?.environment}</p>
                </div>

                <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-white/10">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <Activity size={16} /> Build Version
                        </span>
                    </div>
                    <p className="text-xl font-bold dark:text-white">v{health?.version}</p>
                </div>
            </div>

            {/* Application Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    icon={Users} 
                    label="総ユーザー数" 
                    value={stats?.counts.users} 
                    colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" 
                />
                <StatCard 
                    icon={FolderKanban} 
                    label="総プロジェクト数" 
                    value={stats?.counts.projects} 
                    colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" 
                />
                <StatCard 
                    icon={ListChecks} 
                    label="総タスク数" 
                    value={stats?.counts.tasks} 
                    colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" 
                />
                <StatCard 
                    icon={History} 
                    label="監査ログ蓄積数" 
                    value={stats?.counts.audit_logs} 
                    colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" 
                />
            </div>

            {/* Slow Query Info Card */}
            <div className="glass p-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-indigo-50/50 dark:bg-indigo-900/10">
                <h3 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
                    <Server className="text-indigo-500" /> パフォーマンス監視の仕組み
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-slate-600 dark:text-slate-300">
                    <div className="space-y-2">
                        <p className="font-bold text-indigo-600 dark:text-indigo-400">⏱️ スロークエリ・ロギング</p>
                        <p>SQLAlchemyのイベントリスナーを用いて、実行に0.1秒以上かかるクエリを自動的に検知。バックエンドの構造化ログ（JSON）に詳細を出力し、ボトルネックの早期発見を可能にします。</p>
                    </div>
                    <div className="space-y-2">
                        <p className="font-bold text-indigo-600 dark:text-indigo-400">📊 中間ミドルウェア計測</p>
                        <p>FastAPIのカスタムミドルウェアを介して、全てのリクエストの処理時間をマイクロ秒単位で計測。オブザーバビリティ（可観測性）を意識した設計になっています。</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
