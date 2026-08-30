import { useEffect, useState, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, RotateCw } from 'lucide-react';
import { api } from '@/services/api';
import type { Payment, Paginated } from '@/types';
import { Spinner, ErrorState, EmptyState } from '@/components/States';
import PaymentDrawer from '@/components/PaymentDrawer';
import { formatINR, formatINRFull, formatDateTime, formatPercent, statusColor, priorityColor, categoryLabel } from '@/utils/format';

const STATUSES = ['', 'failed', 'succeeded', 'recovered'];
const CATEGORIES = ['', 'insufficient_funds', 'bank_decline', 'card_expired', 'authentication_failure', 'network_technical', 'temporary_bank_issue', 'unknown'];
const METHODS = ['', 'upi', 'card', 'netbanking', 'wallet'];
const PRIORITIES = ['', 'P1', 'P2', 'P3', 'P4'];
const SORTS = [
  { key: 'created_at', label: 'Date' },
  { key: 'amount', label: 'Amount' },
  { key: 'recovery_probability', label: 'Probability' },
  { key: 'expected_recovery', label: 'Expected' },
];

export default function PaymentsPage() {
  const [data, setData] = useState<Paginated<Payment> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', failure_category: '', method: '', priority: '' });
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [drawerPayment, setDrawerPayment] = useState<Payment | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<{ success: boolean; amount: number } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, page_size: pageSize, sort, order };
    if (search) params.search = search;
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    api.payments(params)
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, sort, order, search, filters]);

  useEffect(() => { load(); }, [load]);

  const openDrawer = (p: Payment) => {
    setDrawerPayment(p);
    setRetryResult(null);
    setDrawerLoading(true);
    api.payment(p.id)
      .then((d) => setDrawerPayment(d))
      .catch(() => {})
      .finally(() => setDrawerLoading(false));
  };

  const handleRetry = async (id: string) => {
    setRetrying(true);
    try {
      const r = await api.retry(id);
      setRetryResult({ success: r.success, amount: r.amount });
      load();
    } catch { /* ignore */ }
    setRetrying(false);
  };

  const handleRemind = async (id: string) => {
    await api.remind(id);
  };

  const toggleSort = (key: string) => {
    if (sort === key) setOrder(order === 'desc' ? 'asc' : 'desc');
    else { setSort(key); setOrder('desc'); }
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Payments</h1>
        <p className="text-sm text-ink-500 mt-1">All transactions with AI recovery analysis for failed payments.</p>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by payment ID, customer, email…"
            className="input pl-9"
          />
        </div>
        <select value={filters.status} onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }} className="input w-auto">
          {STATUSES.map((s) => <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Status'}</option>)}
        </select>
        <select value={filters.failure_category} onChange={(e) => { setFilters({ ...filters, failure_category: e.target.value }); setPage(1); }} className="input w-auto">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c ? categoryLabel(c) : 'All Categories'}</option>)}
        </select>
        <select value={filters.method} onChange={(e) => { setFilters({ ...filters, method: e.target.value }); setPage(1); }} className="input w-auto">
          {METHODS.map((m) => <option key={m} value={m}>{m ? m.toUpperCase() : 'All Methods'}</option>)}
        </select>
        <select value={filters.priority} onChange={(e) => { setFilters({ ...filters, priority: e.target.value }); setPage(1); }} className="input w-auto">
          {PRIORITIES.map((p) => <option key={p} value={p}>{p || 'All Priorities'}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? <Spinner /> : error ? <ErrorState message={error} onRetry={load} /> : data && data.items.length === 0 ? <EmptyState title="No payments found" subtitle="Try adjusting your filters" /> : data && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 border-b border-ink-200">
                <tr className="text-left text-xs text-ink-500 uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium cursor-pointer" onClick={() => toggleSort('created_at')}>
                    <span className="flex items-center gap-1">Payment ID <ArrowUpDown className="w-3 h-3" /></span>
                  </th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium cursor-pointer" onClick={() => toggleSort('amount')}>
                    <span className="flex items-center gap-1">Amount <ArrowUpDown className="w-3 h-3" /></span>
                  </th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Failure Reason</th>
                  <th className="px-4 py-3 font-medium">Prob.</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium cursor-pointer" onClick={() => toggleSort('expected_recovery')}>
                    <span className="flex items-center gap-1">Priority <ArrowUpDown className="w-3 h-3" /></span>
                  </th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.items.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => openDrawer(p)}
                    className="hover:bg-ink-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-ink-600">{p.id}</td>
                    <td className="px-4 py-3 text-ink-700 font-medium">{p.customer_name}</td>
                    <td className="px-4 py-3 font-semibold text-ink-800">{formatINRFull(p.amount)}</td>
                    <td className="px-4 py-3"><span className={`badge ${statusColor(p.status)}`}>{p.status}</span></td>
                    <td className="px-4 py-3 text-xs text-ink-500 max-w-[180px] truncate">{p.failure_reason || '—'}</td>
                    <td className="px-4 py-3">
                      {p.recovery_probability !== null ? (
                        <span className="text-xs font-semibold text-brand-600">{formatPercent(p.recovery_probability)}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-600 max-w-[160px] truncate">{p.recommended_action || '—'}</td>
                    <td className="px-4 py-3">{p.priority ? <span className={`badge ${priorityColor(p.priority)}`}>{p.priority}</span> : '—'}</td>
                    <td className="px-4 py-3 text-xs text-ink-400">{formatDateTime(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.total > pageSize && (
          <div className="px-4 py-3 border-t border-ink-100 flex items-center justify-between">
            <span className="text-xs text-ink-500">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.total)} of {data.total}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="btn-ghost px-2 py-1.5">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-ink-600 px-3 py-1.5">{page} / {totalPages}</span>
              <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="btn-ghost px-2 py-1.5">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
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
