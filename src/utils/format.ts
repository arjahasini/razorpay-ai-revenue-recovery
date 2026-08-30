export function formatINR(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatINRFull(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatPercent(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function statusColor(status: string): string {
  switch (status) {
    case 'succeeded': return 'bg-success-100 text-success-700';
    case 'failed': return 'bg-danger-100 text-danger-700';
    case 'recovered': return 'bg-brand-100 text-brand-700';
    case 'pending': return 'bg-warning-100 text-warning-600';
    default: return 'bg-ink-100 text-ink-600';
  }
}

export function priorityColor(priority: string | null): string {
  switch (priority) {
    case 'P1': return 'bg-danger-100 text-danger-700';
    case 'P2': return 'bg-warning-100 text-warning-600';
    case 'P3': return 'bg-brand-100 text-brand-700';
    case 'P4': return 'bg-ink-100 text-ink-500';
    default: return 'bg-ink-100 text-ink-500';
  }
}

export function riskColor(risk: string | null): string {
  switch (risk) {
    case 'HIGH': return 'bg-success-100 text-success-700';
    case 'MEDIUM': return 'bg-warning-100 text-warning-600';
    case 'LOW': return 'bg-danger-100 text-danger-700';
    default: return 'bg-ink-100 text-ink-500';
  }
}

export function categoryLabel(cat: string | null): string {
  if (!cat) return '—';
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
