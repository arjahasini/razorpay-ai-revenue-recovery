import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { ShieldAlert, Target, TrendingUp, Wallet } from 'lucide-react';
import { api } from '@/services/api';
import type { Analytics as AnalyticsType } from '@/types';
import { Spinner, ErrorState } from '@/components/States';
import StatCard from '@/components/StatCard';
import { formatINR, formatINRFull } from '@/utils/format';

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.analytics()
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading analytics…" />;
  if (error || !data) return <ErrorState message={error || 'Failed to load'} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Revenue Recovery Forecast</h1>
        <p className="text-sm text-ink-500 mt-1">AI-projected recovery based on current failed payments and historical patterns.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenue at Risk" value={formatINR(data.revenue_at_risk)} icon={<ShieldAlert className="w-5 h-5" />} accent="danger" />
        <StatCard label="Expected Recovery" value={formatINR(data.expected_recoverable)} icon={<Target className="w-5 h-5" />} accent="warning" />
        <StatCard label="Current Recovery" value={formatINR(data.current_recovery)} icon={<Wallet className="w-5 h-5" />} accent="success" />
        <StatCard label="Projected Recovery" value={formatINR(data.projected_recovery)} icon={<TrendingUp className="w-5 h-5" />} accent="brand" />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-ink-800">30-Day Recovery Projection</h3>
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-brand-500" /> Projected</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-success-500" /> Current</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data.series}>
            <defs>
              <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="currGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={4} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => formatINR(v)} />
            <Tooltip formatter={(v) => formatINRFull(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
            <Area type="monotone" dataKey="projected" stroke="#3b82f6" strokeWidth={2} fill="url(#projGrad)" />
            <Area type="monotone" dataKey="current" stroke="#22c55e" strokeWidth={2} fill="url(#currGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs text-ink-400 uppercase mb-1">Best-Case Scenario</p>
          <p className="text-2xl font-bold text-success-600">{formatINR(data.best_case)}</p>
          <p className="text-xs text-ink-400 mt-2">If all recoverable payments succeed</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-ink-400 uppercase mb-1">Projected Recovery</p>
          <p className="text-2xl font-bold text-brand-600">{formatINR(data.projected_recovery)}</p>
          <p className="text-xs text-ink-400 mt-2">AI-weighted expected outcome</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-ink-400 uppercase mb-1">Recovery Gap</p>
          <p className="text-2xl font-bold text-warning-600">{formatINR(data.best_case - data.projected_recovery)}</p>
          <p className="text-xs text-ink-400 mt-2">Gap between best-case and projected</p>
        </div>
      </div>
    </div>
  );
}
