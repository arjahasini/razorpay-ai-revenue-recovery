import { Search, Bell, Zap, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { Alert as AlertType, AuthUser } from '@/types';
import { timeAgo } from '@/utils/format';

interface Props {
  user: AuthUser;
  demoMode: boolean;
  onToggleDemo: () => void;
  onNavigate: (p: 'payments' | 'recovery') => void;
  onLogout: () => void;
}

export default function Topbar({ user, demoMode, onToggleDemo, onNavigate, onLogout }: Props) {
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.alerts().then((d) => setAlerts(d.items)).catch(() => {});
    const t = setInterval(() => api.alerts().then((d) => setAlerts(d.items)).catch(() => {}), 15000);
    return () => clearInterval(t);
  }, []);

  const unread = alerts.filter((a) => !a.read).length;
  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-ink-200 px-6 py-3 flex items-center gap-4">
      <div className="flex-1 max-w-md relative">
        <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && query) onNavigate('payments'); }}
          placeholder="Search payments, customers..."
          className="input pl-9"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onToggleDemo}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            demoMode ? 'bg-brand-600 text-white shadow-sm' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
          }`}
        >
          <Zap className="w-4 h-4" fill={demoMode ? 'white' : 'none'} />
          Demo Mode
        </button>

        <div className="relative">
          <button
            onClick={() => setShowAlerts((s) => !s)}
            className="relative w-9 h-9 rounded-lg bg-ink-100 hover:bg-ink-200 flex items-center justify-center transition-colors"
          >
            <Bell className="w-[18px] h-[18px] text-ink-600" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>

          {showAlerts && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowAlerts(false)} />
              <div className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto bg-white rounded-xl border border-ink-200 shadow-lg z-20 animate-slide-in-right">
                <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink-800">Notifications</span>
                  <span className="text-xs text-ink-400">{alerts.length} alerts</span>
                </div>
                {alerts.length === 0 && (
                  <p className="px-4 py-8 text-sm text-ink-400 text-center">No alerts</p>
                )}
                {alerts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { setShowAlerts(false); onNavigate('recovery'); }}
                    className="w-full text-left px-4 py-3 border-b border-ink-50 hover:bg-ink-50 transition-colors flex gap-3"
                  >
                    <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                      a.severity === 'high' ? 'bg-danger-500' : a.severity === 'medium' ? 'bg-warning-500' : 'bg-success-500'
                    }`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-800">{a.title}</p>
                      <p className="text-xs text-ink-500 mt-0.5">{a.message}</p>
                      <p className="text-[11px] text-ink-400 mt-1">{timeAgo(a.timestamp)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu((s) => !s)}
            className="flex items-center gap-2.5 pl-3 border-l border-ink-200 hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-sm font-semibold">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-ink-800 leading-tight">{user.name}</p>
              <p className="text-[11px] text-ink-400">{user.email}</p>
            </div>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-12 w-56 bg-white rounded-xl border border-ink-200 shadow-lg z-20 animate-slide-in-right overflow-hidden">
                <div className="px-4 py-3 border-b border-ink-100">
                  <p className="text-sm font-semibold text-ink-800">{user.name}</p>
                  <p className="text-xs text-ink-400">{user.email}</p>
                </div>
                <button
                  onClick={() => { setShowMenu(false); onLogout(); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
