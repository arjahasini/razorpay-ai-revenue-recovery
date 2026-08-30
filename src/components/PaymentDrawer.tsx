import { X, Check, AlertTriangle, Sparkles, RotateCw, Mail, Brain } from 'lucide-react';
import type { Payment } from '@/types';
import { formatINRFull, formatPercent, formatDateTime, statusColor, riskColor, categoryLabel } from '@/utils/format';

interface Props {
  payment: Payment | null;
  loading: boolean;
  onClose: () => void;
  onRetry: (id: string) => void;
  onRemind: (id: string) => void;
  retrying: boolean;
  retryResult: { success: boolean; amount: number } | null;
}

export default function PaymentDrawer({ payment, loading, onClose, onRetry, onRemind, retrying, retryResult }: Props) {
  if (!payment && !loading) return null;

  return (
    <>
      <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-40 animate-fade-in" onClick={onClose} />
      <div className="fixed right-0 top-0 h-screen w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-ink-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900">Payment Analysis</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-ink-100 flex items-center justify-center transition-colors">
            <X className="w-5 h-5 text-ink-500" />
          </button>
        </div>

        {loading && <div className="py-20 text-center text-sm text-ink-400">Loading AI analysis…</div>}

        {payment && !loading && (
          <div className="px-6 py-5 space-y-6">
            {/* Payment header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`badge ${statusColor(payment.status)}`}>{payment.status}</span>
                {payment.priority && <span className="text-xs font-semibold text-ink-500">{payment.priority}</span>}
              </div>
              <p className="text-2xl font-bold text-ink-900">{formatINRFull(payment.amount)}</p>
              <p className="text-sm text-ink-400 font-mono mt-1">{payment.id}</p>
              <p className="text-sm text-ink-500 mt-1">{payment.customer_name} · {payment.method.toUpperCase()}</p>
              <p className="text-xs text-ink-400 mt-1">{formatDateTime(payment.created_at)}</p>
            </div>

            {/* Retry result banner */}
            {retryResult && (
              <div className={`p-4 rounded-xl animate-slide-up ${retryResult.success ? 'bg-success-50 border border-success-200' : 'bg-danger-50 border border-danger-200'}`}>
                <div className="flex items-center gap-2">
                  {retryResult.success ? <Check className="w-5 h-5 text-success-600" /> : <AlertTriangle className="w-5 h-5 text-danger-600" />}
                  <span className="text-sm font-semibold text-ink-800">
                    {retryResult.success ? 'Payment Recovered!' : 'Retry Failed'}
                  </span>
                </div>
                <p className="text-xs text-ink-600 mt-1">
                  {retryResult.success
                    ? `${formatINRFull(retryResult.amount)} successfully recovered in this simulation.`
                    : `Retry attempt on ${formatINRFull(retryResult.amount)} did not succeed. The AI will re-evaluate.`}
                </p>
              </div>
            )}

            {/* Failure explanation */}
            {payment.failure_explanation && (
              <div className="p-4 rounded-xl bg-ink-50 border border-ink-100">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-brand-600" />
                  <h3 className="text-sm font-semibold text-ink-800">Why did this payment fail?</h3>
                </div>
                <p className="text-sm text-ink-600 leading-relaxed">{payment.failure_explanation}</p>
                <p className="text-xs text-ink-400 mt-2">Category: {categoryLabel(payment.failure_category)}</p>
              </div>
            )}

            {/* Recovery probability */}
            {payment.recovery_probability !== null && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-brand-50 to-accent-500/5 border border-brand-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-600" />
                    <h3 className="text-sm font-semibold text-ink-800">Recovery Probability</h3>
                  </div>
                  <span className={`badge ${riskColor(payment.risk_level)}`}>{payment.risk_level}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-brand-700">{formatPercent(payment.recovery_probability)}</span>
                  <span className="text-sm text-ink-400">expected {formatINRFull(payment.expected_recovery || 0)}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-ink-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-700"
                    style={{ width: `${(payment.recovery_probability || 0) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Explainable factors */}
            {(payment.positive_factors?.length || payment.negative_factors?.length) && (
              <div>
                <h3 className="text-sm font-semibold text-ink-800 mb-3">AI Explanation</h3>
                {payment.positive_factors && payment.positive_factors.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {payment.positive_factors.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-success-600 mt-0.5 shrink-0" />
                        <span className="text-ink-600">{f}</span>
                      </div>
                    ))}
                  </div>
                )}
                {payment.negative_factors && payment.negative_factors.length > 0 && (
                  <div className="space-y-1.5">
                    {payment.negative_factors.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-warning-600 mt-0.5 shrink-0" />
                        <span className="text-ink-600">{f}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AI recommendation */}
            {payment.recommended_action && (
              <div className="p-4 rounded-xl bg-brand-600 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4" />
                  <h3 className="text-sm font-semibold">Recommended Action</h3>
                </div>
                <p className="text-base font-semibold mb-1">{payment.recommended_action}</p>
                <p className="text-sm text-brand-100 leading-relaxed">{payment.action_reason}</p>
              </div>
            )}

            {/* Actions */}
            {payment.status === 'failed' && (
              <div className="flex gap-3">
                <button
                  onClick={() => onRetry(payment.id)}
                  disabled={retrying}
                  className="btn-primary flex-1"
                >
                  <RotateCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
                  {retrying ? 'Retrying…' : 'Retry Payment'}
                </button>
                <button onClick={() => onRemind(payment.id)} className="btn-secondary">
                  <Mail className="w-4 h-4" />
                  Remind
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
