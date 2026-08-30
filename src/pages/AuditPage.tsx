import { useEffect, useState } from 'react';
import { ScrollText, RotateCw, Mail, Brain, Check } from 'lucide-react';
import { api } from '@/services/api';
import type { AuditLog } from '@/types';
import { Spinner, ErrorState, EmptyState } from '@/components/States';
import { formatDateTime, formatINRFull } from '@/utils/format';

const ACTION_ICONS: Record<string, typeof RotateCw> = {
  'Retry payment': RotateCw,
  'Send payment reminder': Mail,
  'AI analysis completed': Brain,
};

const RESULT_STYLES: Record<string, string> = {
  recovered: 'bg-success-100 text-success-700',
  still_failed: 'bg-danger-100 text-danger-700',
  reminder_sent: 'bg-brand-100 text-brand-700',
  analysis: 'bg-ink-100 text-ink-600',
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.auditLogs()
      .then((d) => { setLogs(d.items); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading audit logs…" />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (logs.length === 0) return <EmptyState title="No audit logs yet" subtitle="AI actions will appear here" />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Audit Logs</h1>
        <p className="text-sm text-ink-500 mt-1">Every AI action is logged for transparency and trust.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr className="text-left text-xs text-ink-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Payment ID</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">AI Recommendation</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Result</th>
                <th className="px-4 py-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {logs.map((log) => {
                const Icon = ACTION_ICONS[log.action] || ScrollText;
                return (
                  <tr key={log.id} className="hover:bg-ink-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-ink-400 whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-600">{log.payment_id || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 text-ink-700 font-medium">
                        <Icon className="w-4 h-4 text-ink-400" />
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-600 max-w-[200px] truncate">{log.ai_recommendation || '—'}</td>
                    <td className="px-4 py-3 text-xs text-ink-500 max-w-[220px] truncate">{log.reason || '—'}</td>
                    <td className="px-4 py-3">
                      {log.result && (
                        <span className={`badge ${RESULT_STYLES[log.result] || 'bg-ink-100 text-ink-600'}`}>
                          {log.result.replace('_', ' ')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-ink-700">{log.amount ? formatINRFull(log.amount) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
