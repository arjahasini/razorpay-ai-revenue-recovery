import { LayoutDashboard, CreditCard, Bot, Users, Megaphone, BarChart3, Sparkles, ScrollText, Settings, Zap } from 'lucide-react';

export type PageId = 'dashboard' | 'payments' | 'recovery' | 'customers' | 'campaigns' | 'analytics' | 'insights' | 'audit' | 'settings';

const NAV: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'recovery', label: 'AI Recovery', icon: Bot },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'insights', label: 'AI Insights', icon: Sparkles },
  { id: 'audit', label: 'Audit Logs', icon: ScrollText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface Props {
  active: PageId;
  onNavigate: (p: PageId) => void;
  demoMode: boolean;
}

export default function Sidebar({ active, onNavigate, demoMode }: Props) {
  return (
    <aside className="w-60 shrink-0 bg-white border-r border-ink-200 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-ink-100">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-accent-500 flex items-center justify-center shadow-sm">
          <Zap className="w-5 h-5 text-white" fill="white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-ink-900 leading-tight">Revenue Recovery</h1>
          <p className="text-[11px] text-ink-400 font-medium">AI Agent</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`sidebar-item w-full ${isActive ? 'sidebar-item-active' : ''}`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {demoMode && (
        <div className="mx-3 mb-4 p-3 rounded-xl bg-gradient-to-br from-brand-50 to-accent-500/10 border border-brand-200">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
            <span className="text-xs font-semibold text-brand-700">Demo Mode Active</span>
          </div>
          <p className="text-[11px] text-ink-500 leading-relaxed">Retry simulations are safe — no real charges.</p>
        </div>
      )}
    </aside>
  );
}
