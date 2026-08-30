import { Loader2 } from 'lucide-react';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      {label && <p className="mt-3 text-sm text-ink-400">{label}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div className="w-12 h-12 rounded-full bg-danger-100 flex items-center justify-center mb-3">
        <span className="text-danger-600 text-xl">!</span>
      </div>
      <p className="text-sm text-ink-600 mb-3">{message}</p>
      {onRetry && <button onClick={onRetry} className="btn-secondary">Try again</button>}
    </div>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-ink-100 flex items-center justify-center mb-3">
        <span className="text-ink-300 text-2xl">∅</span>
      </div>
      <p className="text-sm font-medium text-ink-600">{title}</p>
      {subtitle && <p className="text-xs text-ink-400 mt-1">{subtitle}</p>}
    </div>
  );
}
