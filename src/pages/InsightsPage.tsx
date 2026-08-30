import { useEffect, useState } from 'react';
import { Sparkles, AlertTriangle, Info, TrendingUp } from 'lucide-react';
import { api } from '@/services/api';
import type { Insight } from '@/types';
import { Spinner, ErrorState, EmptyState } from '@/components/States';

const SEVERITY_STYLES: Record<string, { bg: string; icon: typeof Info; color: string }> = {
  high: { bg: 'bg-danger-50 border-danger-200', icon: AlertTriangle, color: 'text-danger-600' },
  medium: { bg: 'bg-warning-50 border-warning-200', icon: TrendingUp, color: 'text-warning-600' },
  low: { bg: 'bg-brand-50 border-brand-200', icon: Info, color: 'text-brand-600' },
};

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.insights()
      .then((d) => { setInsights(d.items); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Generating AI insights…" />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (insights.length === 0) return <EmptyState title="No insights available" />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">AI Insights</h1>
        <p className="text-sm text-ink-500 mt-1">Automatically generated insights from your payment recovery data.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((ins, i) => {
          const style = SEVERITY_STYLES[ins.severity] || SEVERITY_STYLES.low;
          const Icon = style.icon;
          return (
            <div
              key={ins.id}
              className={`card card-hover p-5 border ${style.bg} animate-slide-up`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm`}>
                  <Icon className={`w-5 h-5 ${style.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                    <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide">AI Insight</span>
                    {ins.metric && (
                      <span className={`badge ${style.color} bg-white/60`}>{ins.metric}</span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-ink-800 mb-1.5">{ins.title}</h3>
                  <p className="text-xs text-ink-600 leading-relaxed">{ins.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
