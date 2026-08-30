export interface Payment {
  id: string;
  customer_id: number;
  amount: number;
  currency: string;
  status: string;
  method: string;
  failure_reason: string | null;
  failure_category: string | null;
  retry_count: number;
  created_at: string;
  resolved_at: string | null;
  recovery_probability: number | null;
  recommended_action: string | null;
  action_reason: string | null;
  priority: string | null;
  expected_recovery: number | null;
  risk_level: string | null;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  segment: string;
  payment_methods: string[];
  created_at: string;
}

export interface Campaign {
  id: number;
  name: string;
  type: string;
  status: string;
  targeted: number;
  sent: number;
  recoveries: number;
  revenue_recovered: number;
  created_at: string;
  conversion_rate: number;
}

export interface Alert {
  id: number;
  timestamp: string;
  severity: string;
  type: string;
  title: string;
  message: string;
  payment_id: string | null;
  amount: number | null;
  read: boolean;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  payment_id: string | null;
  action: string;
  ai_recommendation: string | null;
  reason: string | null;
  result: string | null;
  amount: number | null;
}

export interface DB {
  payments: Payment[];
  customers: Customer[];
  campaigns: Campaign[];
  alerts: Alert[];
  auditLogs: AuditLog[];
}
