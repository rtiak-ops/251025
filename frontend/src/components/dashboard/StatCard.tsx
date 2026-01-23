import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  color: string;
  subValue?: string;
  isAlert?: boolean;
  onClick: () => void;
}

export default function StatCard({ title, value, icon, color, subValue, isAlert, onClick }: StatCardProps) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    amber: 'bg-amber-500/10 text-amber-500',
    red: 'bg-red-500/10 text-red-500',
  };

  const colorClass = colorMap[color] || 'bg-slate-500/10 text-slate-500';

  return (
    <div 
      onClick={onClick}
      className={`glass p-6 rounded-3xl relative overflow-hidden group hover:-translate-y-1 transition-all cursor-pointer ${isAlert ? 'ring-2 ring-red-500/50' : ''}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${colorClass}`}>
          {icon}
        </div>
        {isAlert && <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping"></span>}
      </div>
      <div className="text-3xl font-bold text-slate-800 dark:text-white mb-1">{value}</div>
      <div className="text-sm font-medium text-slate-500 dark:text-white">{title}</div>
      {subValue && <div className="text-[10px] mt-2 font-bold text-green-500 dark:text-green-400 uppercase tracking-tight">{subValue}</div>}
    </div>
  );
}
