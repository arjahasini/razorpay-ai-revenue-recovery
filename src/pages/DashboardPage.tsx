import { useEffect, useState } from 'react';
import { Wallet, AlertTriangle, TrendingUp, Sparkles, Users, ShieldAlert, Check, ArrowRight, Zap } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '@/services/api';
import type { Dashboard as DashboardType } from '@/types';
import StatCard from '@/components/StatCard';
import { Spinner, ErrorState } from '@/components/States';
import { formatINR, formatINRFull, formatPercent } from '@/utils/format';
import type { PageId } from '@/components/Sidebar';

const PIE_COLORS = ['#3b82f6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#94a3b8'];

interface Props {
  onNavigate: (p: PageId) => void;
  demoMode: boolean;
}

export default function DashboardPage({ onNavigate, demoMode }: Props) {
  const [data, setData] = useState<DashboardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.dashboard()
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading dashboard…" />;
  if (error || !data) return <ErrorState message={error || 'Failed to load dashboard'} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 via-ink-800 to-brand-900 p-8 text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl translate-y-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-accent-400" />
            </div>
            <span className="text-sm font-medium text-brand-200">AI Revenue Recovery</span>
            {demoMode && (
              <span className="ml-2 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success-500/20 text-success-300 text-xs font-semibold border border-success-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-success-400 animate-pulse" /> Demo Mode
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Turn failed payments into recovered revenue.</h1>
          <p className="text-ink-300 text-base max-w-xl mb-6">AI analyzes every failed payment, predicts recovery probability, and recommends the best action to recover lost revenue.</p>

          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-brand-200 uppercase tracking-wide font-medium mb-1">Recoverable Revenue</p>
              <p className="text-4xl font-bold tracking-tight">{formatINR(data.recoverable_revenue)}</p>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <p className="text-xs text-brand-200 uppercase tracking-wide font-medium mb-1">Expected Recovery</p>
              <p className="text-4xl font-bold tracking-tight text-accent-400">{formatINR(data.ai_predicted_recovery)}</p>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <p className="text-xs text-brand-200 uppercase tracking-wide font-medium mb-1">Recovery Rate</p>
              <p className="text-4xl font-bold tracking-tight text-success-400">{formatPercent(data.recovery_rate)}</p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('recovery')}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-ink-900 text-sm font-semibold hover:bg-brand-50 transition-all shadow-sm hover:shadow-md"
          >
            <Zap className="w-4 h-4 text-brand-600" fill="currentColor" />
            Open AI Recovery Queue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Volume" value={formatINR(data.total_volume)} sub={`${data.total_payments} payments`} icon={<Wallet className="w-5 h-5" />} accent="brand" />
        <StatCard label="Failed Payments" value={String(data.failed_payments)} sub={formatINR(data.recoverable_revenue) + ' at risk'} icon={<AlertTriangle className="w-5 h-5" />} accent="danger" />
        <StatCard label="Revenue Recovered" value={formatINR(data.revenue_recovered)} trend={data.recovery_rate * 100} icon={<TrendingUp className="w-5 h-5" />} accent="success" />
        <StatCard label="AI Predicted Recovery" value={formatINR(data.ai_predicted_recovery)} sub={`${data.customers_needing_action} customers need action`} icon={<Sparkles className="w-5 h-5" />} accent="brand" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Succeeded" value={String(data.succeeded_payments)} icon={<Check className="w-5 h-5" />} accent="success" />
        <StatCard label="Recovered" value={String(data.recovered_payments)} icon={<TrendingUp className="w-5 h-5" />} accent="brand" />
        <StatCard label="Revenue at Risk" value={formatINR(data.revenue_at_risk)} icon={<ShieldAlert className="w-5 h-5" />} accent="warning" />
        <StatCard label="Customers Needing Action" value={String(data.customers_needing_action)} icon={<Users className="w-5 h-5" />} accent="neutral" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-ink-800 mb-4">Revenue Recovered Over Time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.charts.recovered_over_time}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} interval={6} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => formatINR(v)} />
              <Tooltip formatter={(v) => formatINRFull(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Area type="monotone" dataKey="recovered" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-ink-800 mb-4">Failure Reason Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.charts.failure_distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {data.charts.failure_distribution.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-ink-800 mb-4">Failed vs Recovered (14 days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.charts.failed_vs_recovered}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={1} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="recovered" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-ink-800 mb-4">Recovery Probability Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.charts.probability_distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Funnel */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-ink-800 mb-4">Recovery Funnel</h3>
        <div className="space-y-3">
          {data.charts.funnel.map((step, i) => {
            const max = data.charts.funnel[0].value || 1;
            const pct = (step.value / max) * 100;
            return (
              <div key={i} className="flex items-center gap-4">
                <span className="text-sm text-ink-600 w-44 shrink-0">{step.stage}</span>
                <div className="flex-1 h-8 rounded-lg bg-ink-100 overflow-hidden relative">
                  <div
                    className="h-full rounded-lg bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-700 flex items-center justify-end pr-3"
                    style={{ width: `${Math.max(pct, 5)}%` }}
                  >
                    <span className="text-xs font-semibold text-white">{step.value}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
