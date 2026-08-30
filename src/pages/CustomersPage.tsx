import { useEffect, useState, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, Mail, Phone, Star } from 'lucide-react';
import { api } from '@/services/api';
import type { Customer, Paginated } from '@/types';
import { Spinner, ErrorState, EmptyState } from '@/components/States';
import { formatINR, formatPercent, formatDate } from '@/utils/format';

const SEGMENT_COLORS: Record<string, string> = {
  premium: 'bg-brand-100 text-brand-700',
  regular: 'bg-ink-100 text-ink-600',
  new: 'bg-accent-400/20 text-accent-600',
  'at-risk': 'bg-danger-100 text-danger-700',
};

export default function CustomersPage() {
  const [data, setData] = useState<Paginated<Customer> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [detail, setDetail] = useState<Customer | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const pageSize = 12;

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, page_size: pageSize };
    if (search) params.search = search;
    api.customers(params)
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const openDetail = (c: Customer) => {
    setSelected(c);
    setDetailLoading(true);
    api.customer(c.id)
      .then((d) => setDetail(d))
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Customers</h1>
        <p className="text-sm text-ink-500 mt-1">Customer profiles with AI recovery scores and payment history.</p>
      </div>

      <div className="card p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search customers…"
            className="input pl-9"
          />
        </div>
      </div>

      {loading ? <Spinner /> : error ? <ErrorState message={error} onRetry={load} /> : data && data.items.length === 0 ? <EmptyState title="No customers found" /> : data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.items.map((c) => (
            <button
              key={c.id}
              onClick={() => openDetail(c)}
              className="card card-hover p-5 text-left animate-slide-up"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-sm font-semibold">
                    {c.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-800">{c.name}</p>
                    <p className="text-xs text-ink-400">{c.email}</p>
                  </div>
                </div>
                <span className={`badge ${SEGMENT_COLORS[c.segment] || 'bg-ink-100'}`}>{c.segment}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="text-center p-2 rounded-lg bg-ink-50">
                  <p className="text-lg font-bold text-ink-800">{c.total_payments}</p>
                  <p className="text-[10px] text-ink-400">Payments</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-success-50">
                  <p className="text-lg font-bold text-success-600">{c.successful_payments}</p>
                  <p className="text-[10px] text-ink-400">Success</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-danger-50">
                  <p className="text-lg font-bold text-danger-600">{c.failed_payments}</p>
                  <p className="text-[10px] text-ink-400">Failed</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-ink-100">
                <div>
                  <p className="text-[10px] text-ink-400 uppercase">Revenue</p>
                  <p className="text-sm font-semibold text-ink-700">{formatINR(c.total_revenue)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-ink-400 uppercase">Recovery Score</p>
                  <p className="text-sm font-semibold text-brand-600 flex items-center gap-1 justify-end">
                    <Star className="w-3 h-3 fill-brand-500 text-brand-500" />
                    {formatPercent(c.recovery_score)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {data && data.total > pageSize && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-500">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="btn-ghost px-2 py-1.5"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="btn-ghost px-2 py-1.5"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Customer detail modal */}
      {(selected || detailLoading) && (
        <>
          <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-40 animate-fade-in" onClick={() => { setSelected(null); setDetail(null); }} />
          <div className="fixed right-0 top-0 h-screen w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-ink-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink-900">Customer Profile</h2>
              <button onClick={() => { setSelected(null); setDetail(null); }} className="w-8 h-8 rounded-lg hover:bg-ink-100 flex items-center justify-center transition-colors text-ink-500">✕</button>
            </div>
            {detailLoading || !detail ? (
              <div className="py-20 text-center text-sm text-ink-400">Loading…</div>
            ) : (
              <div className="px-6 py-5 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-lg font-bold">
                    {detail.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-ink-900">{detail.name}</p>
                    <p className="text-sm text-ink-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {detail.email}</p>
                    <p className="text-xs text-ink-400 flex items-center gap-1"><Phone className="w-3 h-3" /> {detail.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`badge ${SEGMENT_COLORS[detail.segment]}`}>{detail.segment}</span>
                  <span className="text-xs text-ink-400">Since {formatDate(detail.created_at)}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-ink-50">
                    <p className="text-xs text-ink-400">Total Payments</p>
                    <p className="text-xl font-bold text-ink-800">{detail.total_payments}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-success-50">
                    <p className="text-xs text-ink-400">Successful</p>
                    <p className="text-xl font-bold text-success-600">{detail.successful_payments}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-danger-50">
                    <p className="text-xs text-ink-400">Failed</p>
                    <p className="text-xl font-bold text-danger-600">{detail.failed_payments}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-brand-50">
                    <p className="text-xs text-ink-400">AI Recovery Score</p>
                    <p className="text-xl font-bold text-brand-600">{formatPercent(detail.recovery_score)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-ink-50">
                    <p className="text-xs text-ink-400">Total Revenue</p>
                    <p className="text-lg font-bold text-ink-800">{formatINR(detail.total_revenue)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-danger-50">
                    <p className="text-xs text-ink-400">Failed Revenue</p>
                    <p className="text-lg font-bold text-danger-600">{formatINR(detail.failed_revenue)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-ink-400 uppercase mb-2">Payment Methods</p>
                  <div className="flex gap-2 flex-wrap">
                    {detail.payment_methods.map((m, i) => (
                      <span key={i} className="badge bg-ink-100 text-ink-600">{m.toUpperCase()}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-ink-400 uppercase mb-2">Recent Activity</p>
                  <div className="space-y-2">
                    {detail.recent_activity?.map((a, i) => (
                      <p key={i} className="text-xs text-ink-500 p-2 rounded-lg bg-ink-50">{a}</p>
                    ))}
                  </div>
                </div>

                {detail.recent_payments && detail.recent_payments.length > 0 && (
                  <div>
                    <p className="text-xs text-ink-400 uppercase mb-2">Recent Payments</p>
                    <div className="space-y-1.5">
                      {detail.recent_payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-ink-50 text-xs">
                          <span className="font-mono text-ink-500">{p.id}</span>
                          <span className="font-semibold text-ink-700">{formatINR(p.amount)}</span>
                          <span className={`badge ${p.status === 'succeeded' ? 'bg-success-100 text-success-700' : p.status === 'recovered' ? 'bg-brand-100 text-brand-700' : 'bg-danger-100 text-danger-700'}`}>{p.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
