import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar, { type PageId } from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import DashboardPage from '@/pages/DashboardPage';
import PaymentsPage from '@/pages/PaymentsPage';
import RecoveryPage from '@/pages/RecoveryPage';
import CustomersPage from '@/pages/CustomersPage';
import CampaignsPage from '@/pages/CampaignsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import InsightsPage from '@/pages/InsightsPage';
import AuditPage from '@/pages/AuditPage';
import SettingsPage from '@/pages/SettingsPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/States';

function DashboardLayout() {
  const [page, setPage] = useState<PageId>('dashboard');
  const [demoMode, setDemoMode] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" replace />;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-ink-50">
      <Sidebar active={page} onNavigate={setPage} demoMode={demoMode} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          user={user}
          demoMode={demoMode}
          onToggleDemo={() => setDemoMode((d) => !d)}
          onNavigate={(p) => setPage(p)}
          onLogout={handleLogout}
        />
        <main className="flex-1 p-6 overflow-x-hidden">
          {page === 'dashboard' && <DashboardPage onNavigate={setPage} demoMode={demoMode} />}
          {page === 'payments' && <PaymentsPage />}
          {page === 'recovery' && <RecoveryPage />}
          {page === 'customers' && <CustomersPage />}
          {page === 'campaigns' && <CampaignsPage />}
          {page === 'analytics' && <AnalyticsPage />}
          {page === 'insights' && <InsightsPage />}
          {page === 'audit' && <AuditPage />}
          {page === 'settings' && <SettingsPage demoMode={demoMode} onToggleDemo={() => setDemoMode((d) => !d)} />}
        </main>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Loading…" />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Loading…" />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <LoginPage />;
}

function SignupRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Loading…" />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <SignupPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/signup" element={<SignupRoute />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
