import type {
  Dashboard, Payment, Paginated, QueueData, Customer, Campaign,
  Analytics, Insight, AuditLog, Alert, RetryResult, AuthUser,
} from '@/types';

const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
}

function setToken(token: string, remember: boolean) {
  if (remember) {
    localStorage.setItem('auth_token', token);
    sessionStorage.removeItem('auth_token');
  } else {
    sessionStorage.setItem('auth_token', token);
    localStorage.removeItem('auth_token');
  }
}

function clearToken() {
  localStorage.removeItem('auth_token');
  sessionStorage.removeItem('auth_token');
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options?.headers) Object.assign(headers, options.headers as Record<string, string>);

  const res = await fetch(`${BASE}${url}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new CustomEvent('auth-expired'));
    throw new Error('Session expired');
  }

  const text = await res.text();
  if (!text) throw new Error('Empty response from server');

  try {
    const json = JSON.parse(text);
    if (!res.ok) {
      const msg = json.detail || json.message || `API error ${res.status}`;
      throw new Error(msg);
    }
    return json as T;
  } catch (e) {
    if (e instanceof Error && e.message !== 'Empty response from server' && !e.message.startsWith('API error') && e.message !== 'Session expired') {
      throw new Error(`Unexpected response format: ${text.slice(0, 100)}`);
    }
    throw e;
  }
}

export const api = {
  // Auth
  login: async (email: string, password: string, remember: boolean) => {
    const data = await fetchJson<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token, remember);
    return data;
  },
  signup: async (name: string, email: string, password: string) => {
    const data = await fetchJson<{ token: string; user: AuthUser }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    setToken(data.token, true);
    return data;
  },
  me: () => fetchJson<AuthUser>('/auth/me'),
  logout: () => { clearToken(); },

  // Dashboard
  dashboard: () => fetchJson<Dashboard>('/dashboard'),
  payments: (params: Record<string, string | number>) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return fetchJson<Paginated<Payment>>(`/payments?${qs}`);
  },
  payment: (id: string) => fetchJson<Payment>(`/payments/${id}`),
  recoveryQueue: () => fetchJson<QueueData>('/recovery/queue'),
  recovery: (id: string) => fetchJson<Record<string, unknown>>(`/recovery/${id}`),
  retry: (id: string) => fetchJson<RetryResult>(`/recovery/${id}/retry`, { method: 'POST' }),
  remind: (id: string) => fetchJson<RetryResult>(`/recovery/${id}/remind`, { method: 'POST' }),
  customers: (params: Record<string, string | number>) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return fetchJson<Paginated<Customer>>(`/customers?${qs}`);
  },
  customer: (id: number) => fetchJson<Customer>(`/customers/${id}`),
  campaigns: () => fetchJson<{ items: Campaign[] }>('/campaigns'),
  createCampaign: (body: { name: string; type: string }) =>
    fetchJson<Campaign>('/campaigns', { method: 'POST', body: JSON.stringify(body) }),
  analytics: () => fetchJson<Analytics>('/analytics'),
  insights: () => fetchJson<{ items: Insight[] }>('/insights'),
  auditLogs: () => fetchJson<{ items: AuditLog[] }>('/audit-logs'),
  alerts: () => fetchJson<{ items: Alert[] }>('/alerts'),
  markAlertRead: (id: number) => fetchJson<{ ok: boolean }>(`/alerts/${id}/read`, { method: 'POST' }),
};
