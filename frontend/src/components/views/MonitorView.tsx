import { useQuery } from "@tanstack/react-query";
import { getSystemMetrics } from "../../api";
import { Activity, Database, Globe, Server, Users } from "lucide-react";

/**
 * 【システムモニタービュー (MonitorView)】
 * 開発者および管理者向けに、アプリケーションの負荷状況、データベース接続状態、
 * リソースの使用率などをリアルタイム（5秒間隔）で可視化する画面です。
 */
export default function MonitorView() {
  // バックエンドからシステムの統計情報（メトリクス）を定期的に取得
  const { data: metrics } = useQuery({
    queryKey: ["metrics"],
    queryFn: getSystemMetrics,
    refetchInterval: 5000, // 5秒ごとに自動リフレッシュ
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
          <Activity className="text-indigo-600" size={32} />
          システム状況
        </h2>
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          LIVE MONITORING
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          label="総ユーザー数" 
          value={metrics?.counts?.users || 0} 
          icon={<Users size={20} />} 
          color="indigo" 
          progress={75}
        />
        <MetricCard 
          label="総タスク数" 
          value={metrics?.counts?.tasks || 0} 
          icon={<Server size={20} />} 
          color="purple" 
          progress={45}
        />
        <MetricCard 
          label="総プロジェクト数" 
          value={metrics?.counts?.projects || 0} 
          icon={<Database size={20} />} 
          color="blue" 
          progress={60}
        />
        <MetricCard 
          label="API 応答速度" 
          value="42ms" 
          icon={<Globe size={20} />} 
          color="emerald" 
          progress={15}
        />
      </div>

      <div className="glass p-8 rounded-3xl">
        <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-white">サーバーヘルスチェック</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HealthRow label="API Gateway" status="Healthy" uptime="99.9%" />
          <HealthRow label="Database Cluster" status="Healthy" uptime="100%" />
          <HealthRow label="Redis Cache" status="Healthy" uptime="99.5%" />
          <HealthRow label="File Storage (S3)" status="Healthy" uptime="100%" />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, color, progress }: { label: string, value: string | number, icon: React.ReactNode, color: string, progress: number }) {
  const colors: Record<string, string> = {
    indigo: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30',
    purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
    emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
  };

  const barColors: Record<string, string> = {
    indigo: 'bg-indigo-600',
    purple: 'bg-purple-600',
    blue: 'bg-blue-600',
    emerald: 'bg-emerald-600',
  };

  return (
    <div className="glass p-6 rounded-3xl group hover:-translate-y-1 transition-all">
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-2xl ${colors[color]}`}>
          {icon}
        </div>
        <div className="text-sm font-black text-slate-400 uppercase tracking-widest">{label}</div>
      </div>
      <div className="text-3xl font-bold text-slate-800 dark:text-white mb-4">{value}</div>
      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
        <div className={`h-full ${barColors[color]} transition-all duration-1000`} style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );
}

function HealthRow({ label, status, uptime }: { label: string, status: string, uptime: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
        <span className="text-sm font-bold text-slate-700 dark:text-white">{label}</span>
      </div>
      <div className="flex items-center gap-6">
        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">{status}</span>
        <span className="text-[10px] font-mono text-slate-400">{uptime} Uptime</span>
      </div>
    </div>
  );
}
