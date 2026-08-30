import { useEffect, useState, useCallback } from 'react';
import { Megaphone, Plus, Users, Send, Check, TrendingUp } from 'lucide-react';
import { api } from '@/services/api';
import type { Campaign } from '@/types';
import { Spinner, ErrorState, EmptyState } from '@/components/States';
import { formatINR, formatDate } from '@/utils/format';

const TYPE_LABELS: Record<string, string> = {
  reminder: 'Failed Payment Reminder',
  smart_retry: 'Smart Retry',
  method_recovery: 'Payment Method Recovery',
  high_value: 'High-Value Recovery',
};

const TYPE_COLORS: Record<string, string> = {
  reminder: 'bg-brand-100 text-brand-700',
  smart_retry: 'bg-accent-400/20 text-accent-600',
  method_recovery: 'bg-warning-100 text-warning-600',
  high_value: 'bg-danger-100 text-danger-700',
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('reminder');
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.campaigns()
      .then((d) => { setCampaigns(d.items); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.createCampaign({ name: newName, type: newType });
      setShowCreate(false);
      setNewName('');
      load();
    } catch { /* ignore */ }
    setCreating(false);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Recovery Campaigns</h1>
          <p className="text-sm text-ink-500 mt-1">Create and track simulated recovery campaigns.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {loading ? <Spinner /> : error ? <ErrorState message={error} onRetry={load} /> : campaigns.length === 0 ? <EmptyState title="No campaigns yet" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((c) => (
            <div key={c.id} className="card card-hover p-5 animate-slide-up">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/10 to-accent-500/10 flex items-center justify-center">
                    <Megaphone className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-800">{c.name}</p>
                    <p className="text-xs text-ink-400">{formatDate(c.created_at)}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`badge ${TYPE_COLORS[c.type] || 'bg-ink-100'}`}>{TYPE_LABELS[c.type] || c.type}</span>
                  <span className={`badge ${c.status === 'active' ? 'bg-success-100 text-success-700' : 'bg-ink-100 text-ink-500'}`}>{c.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="text-center p-2.5 rounded-lg bg-ink-50">
                  <Users className="w-4 h-4 text-ink-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-ink-800">{c.targeted}</p>
                  <p className="text-[10px] text-ink-400">Targeted</p>
                </div>
                <div className="text-center p-2.5 rounded-lg bg-brand-50">
                  <Send className="w-4 h-4 text-brand-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-brand-700">{c.sent}</p>
                  <p className="text-[10px] text-ink-400">Sent</p>
                </div>
                <div className="text-center p-2.5 rounded-lg bg-success-50">
                  <Check className="w-4 h-4 text-success-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-success-600">{c.recoveries}</p>
                  <p className="text-[10px] text-ink-400">Recovered</p>
                </div>
                <div className="text-center p-2.5 rounded-lg bg-warning-50">
                  <TrendingUp className="w-4 h-4 text-warning-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-warning-600">{c.conversion_rate}%</p>
                  <p className="text-[10px] text-ink-400">Conv. Rate</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-ink-100 flex items-center justify-between">
                <span className="text-xs text-ink-400">Revenue Recovered</span>
                <span className="text-sm font-bold text-success-600">{formatINR(c.revenue_recovered)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <>
          <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-40 animate-fade-in" onClick={() => setShowCreate(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 animate-slide-up">
            <div className="p-6">
              <h2 className="text-lg font-bold text-ink-900 mb-4">New Recovery Campaign</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-ink-500 uppercase">Campaign Name</label>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Weekend Recovery Sprint" className="input mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-500 uppercase">Campaign Type</label>
                  <select value={newType} onChange={(e) => setNewType(e.target.value)} className="input mt-1">
                    <option value="reminder">Failed Payment Reminder</option>
                    <option value="smart_retry">Smart Retry — Temporary Failures</option>
                    <option value="method_recovery">Payment Method Recovery</option>
                    <option value="high_value">High-Value Recovery</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleCreate} disabled={creating || !newName.trim()} className="btn-primary flex-1">
                  {creating ? 'Creating…' : 'Create Campaign'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
