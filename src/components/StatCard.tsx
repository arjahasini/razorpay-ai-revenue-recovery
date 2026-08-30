import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  label: string;
  value: string;
  sub?: string;
  trend?: number;
  icon?: ReactNode;
  accent?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
}

const accentMap = {
  brand: 'from-brand-500/10 to-brand-500/5 text-brand-600',
  success: 'from-success-500/10 to-success-500/5 text-success-600',
  warning: 'from-warning-500/10 to-warning-500/5 text-warning-600',
  danger: 'from-danger-500/10 to-danger-500/5 text-danger-600',
  neutral: 'from-ink-500/10 to-ink-500/5 text-ink-600',
};

export default function StatCard({ label, value, sub, trend, icon, accent = 'neutral' }: Props) {
  return (
    <div className="card card-hover p-5 animate-slide-up">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-ink-500 uppercase tracking-wide">{label}</span>
        {icon && (
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${accentMap[accent]} flex items-center justify-center`}>
            {icon}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-ink-900 tracking-tight">{value}</p>
      <div className="flex items-center gap-2 mt-2">
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-semibold ${trend >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        {sub && <span className="text-xs text-ink-400">{sub}</span>}
      </div>
    </div>
  );
}
