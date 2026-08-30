import { useEffect, useState, useCallback } from 'react';
import { Sparkles, RotateCw, Mail, Eye, X, Check, AlertTriangle, Zap, Target } from 'lucide-react';
import { api } from '@/services/api';
import type { QueueData, QueueItem, Payment } from '@/types';
import { Spinner, ErrorState, EmptyState } from '@/components/States';
import PaymentDrawer from '@/components/PaymentDrawer';
import { formatINR, formatINRFull, formatPercent, priorityColor, riskColor, categoryLabel } from '@/utils/format';

export default function RecoveryPage() {
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const [drawerPayment, setDrawerPayment] = useState<Payment | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<{ success: boolean; amount: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.recoveryQueue()
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const openDrawer = (item: QueueItem) => {
    setDrawerPayment(null);
    setRetryResult(null);
    setDrawerLoading(true);
    api.payment(item.payment_id)
      .then((d) => setDrawerPayment(d))
      .catch(() => {})
      .finally(() => setDrawerLoading(false));
  };

  const handleRetry = async (id: string) => {
    setRetrying(true);
    try {
      const r = await api.retry(id);
      setRetryResult({ success: r.success, amount: r.amount });
      showToast(r.success ? `${formatINRFull(r.amount)} recovered!` : 'Retry failed — AI will re-evaluate');
      load();
    } catch { showToast('Retry failed'); }
    setRetrying(false);
  };

  const handleRemind = async (id: string) => {
    try {
      await api.remind(id);
      showToast('Reminder sent');
    } catch { showToast('Failed to send reminder'); }
  };

  const handleDismiss = (id: string) => {
    showToast('Payment dismissed from queue');
  };

  const filtered = data ? (filter === 'all' ? data.items : data.items.filter((i) => i.priority === filter)) : [];

  if (loading) return <Spinner label="Loading AI recovery queue…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;
  if (data.items.length === 0) return <EmptyState title="No failed payments in queue" subtitle="All caught up!" />;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 px-4 py-3 rounded-xl bg-ink-900 text-white text-sm font-medium shadow-lg animate-slide-in-right">
          {toast}
        </div>
      )}

      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-accent-500 p-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Recovery Queue</h1>
            <p className="text-brand-100 text-sm mt-1">
              Recover <span className="font-bold text-white">{formatINR(data.summary.headline_amount)}</span> from{' '}
              <span className="font-bold text-white">{data.summary.headline_count}</span> high-priority payments first.
            </p>
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-6 text-sm">
          <div><span className="text-brand-200">Total Expected Recovery</span> <span className="font-bold ml-2">{formatINR(data.total_expected_recovery)}</span></div>
          <div><span className="text-brand-200">Payments in Queue</span> <span className="font-bold ml-2">{data.total}</span></div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'P1', 'P2', 'P3', 'P4'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f ? 'bg-brand-600 text-white shadow-sm' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
            }`}
          >
            {f === 'all' ? 'All' : f}
            <span className="ml-1.5 text-xs opacity-70">
              {f === 'all' ? data.total : data.items.filter((i) => i.priority === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* Queue table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr className="text-left text-xs text-ink-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Recovery Prob.</th>
                <th className="px-4 py-3 font-medium">Expected</th>
                <th className="px-4 py-3 font-medium">Failure</th>
                <th className="px-4 py-3 font-medium">AI Recommendation</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((item) => (
                <tr key={item.payment_id} className="hover:bg-ink-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${priorityColor(item.priority)}`}>{item.priority}</span>
                      <span className={`badge ${riskColor(item.risk_level)}`}>{item.risk_level}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-ink-700">{item.customer_name}</td>
                  <td className="px-4 py-3 font-semibold text-ink-800">{formatINRFull(item.amount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-ink-200 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500" style={{ width: `${item.recovery_probability * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-brand-600">{formatPercent(item.recovery_probability)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-success-600">{formatINR(item.expected_recovery)}</td>
                  <td className="px-4 py-3 text-xs text-ink-500 max-w-[140px] truncate">{categoryLabel(item.failure_category)}</td>
                  <td className="px-4 py-3 text-xs text-ink-600 max-w-[180px] truncate">
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-brand-500 shrink-0" />
                      {item.recommended_action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => handleRetry(item.payment_id)} className="w-8 h-8 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-600 flex items-center justify-center transition-colors" title="Retry">
                        <RotateCw className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleRemind(item.payment_id)} className="w-8 h-8 rounded-lg bg-ink-100 hover:bg-ink-200 text-ink-600 flex items-center justify-center transition-colors" title="Remind">
                        <Mail className="w-4 h-4" />
                      </button>
                      <button onClick={() => openDrawer(item)} className="w-8 h-8 rounded-lg bg-ink-100 hover:bg-ink-200 text-ink-600 flex items-center justify-center transition-colors" title="View Details">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDismiss(item.payment_id)} className="w-8 h-8 rounded-lg bg-ink-100 hover:bg-danger-100 hover:text-danger-600 text-ink-400 flex items-center justify-center transition-colors" title="Dismiss">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PaymentDrawer
        payment={drawerPayment}
        loading={drawerLoading}
        onClose={() => setDrawerPayment(null)}
        onRetry={handleRetry}
        onRemind={handleRemind}
        retrying={retrying}
        retryResult={retryResult}
      />
    </div>
  );
}
