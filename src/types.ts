export interface Dashboard {
  total_volume: number;
  failed_payments: number;
  recoverable_revenue: number;
  revenue_recovered: number;
  recovery_rate: number;
  ai_predicted_recovery: number;
  customers_needing_action: number;
  revenue_at_risk: number;
  total_payments: number;
  succeeded_payments: number;
  recovered_payments: number;
  charts: {
    recovered_over_time: { date: string; recovered: number }[];
    failed_vs_recovered: { date: string; failed: number; recovered: number }[];
    failure_distribution: { name: string; value: number }[];
    probability_distribution: { bucket: string; count: number }[];
    funnel: { stage: string; value: number }[];
  };
}

export interface Payment {
  id: string;
  customer_id: number;
  customer_name: string;
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
  positive_factors?: string[];
  negative_factors?: string[];
  failure_explanation?: string;
  customer_email?: string;
  customer_segment?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface QueueItem {
  payment_id: string;
  customer_id: number;
  customer_name: string;
  amount: number;
  recovery_probability: number;
  expected_recovery: number;
  failure_reason: string | null;
  failure_category: string | null;
  recommended_action: string | null;
  action_reason: string | null;
  priority: string;
  risk_level: string | null;
}

export interface QueueData {
  items: QueueItem[];
  total: number;
  total_expected_recovery: number;
  summary: { headline_amount: number; headline_count: number };
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  segment: string;
  payment_methods: string[];
  created_at: string;
  total_payments: number;
  successful_payments: number;
  failed_payments: number;
  total_revenue: number;
  failed_revenue: number;
  recovered_revenue: number;
  recovery_score: number;
  recent_activity?: string[];
  recent_payments?: {
    id: string;
    amount: number;
    status: string;
    method: string;
    failure_category: string | null;
    created_at: string;
    recovery_probability: number | null;
    priority: string | null;
  }[];
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

export interface Insight {
  id: string;
  title: string;
  detail: string;
  severity: string;
  metric: string | null;
}

export interface Analytics {
  revenue_at_risk: number;
  expected_recoverable: number;
  best_case: number;
  current_recovery: number;
  projected_recovery: number;
  series: { date: string; projected: number; current: number }[];
}

export interface RetryResult {
  payment_id: string;
  success: boolean;
  new_status: string;
  amount: number;
  ai_recommendation: string;
  reason: string;
  simulated: boolean;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}
