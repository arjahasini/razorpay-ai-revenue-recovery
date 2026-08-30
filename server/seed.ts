import type { DB, Payment, Customer, Campaign, Alert, AuditLog } from './types';
import { analyzePayment } from './recovery';

// Deterministic PRNG so the demo data is stable across restarts
let _seed = 42;
function rand(): number {
  _seed = (_seed * 1103515245 + 12345) & 0x7fffffff;
  return _seed / 0x7fffffff;
}
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Krishna',
  'Ishaan', 'Rohan', 'Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Kiara', 'Myra',
  'Sara', 'Anika', 'Riya', 'Navya', 'Kabir', 'Dhruv', 'Aryan', 'Rahul',
  'Priya', 'Neha', 'Pooja', 'Shreya', 'Karan', 'Varun', 'Nikhil', 'Tanvi',
];
const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Gupta', 'Singh',
  'Mehta', 'Joshi', 'Rao', 'Das', 'Kumar', 'Malhotra', 'Bose', 'Chopra',
  'Kapoor', 'Khanna', 'Banerjee', 'Pillai', 'Menon', 'Agarwal', 'Shah', 'Bhat',
];
const COMPANIES = ['acme', 'globex', 'initech', 'umbrella', 'stark', 'wayne', 'hooli', 'piedpiper'];
const SEGMENTS = ['premium', 'regular', 'new', 'at-risk'];
const METHODS = ['upi', 'card', 'netbanking', 'wallet'];

const FAILURE_REASONS: Record<string, string[]> = {
  insufficient_funds: ['Insufficient balance in account', 'Customer account has insufficient funds'],
  bank_decline: ['Issuer declined transaction', 'Do not honor — bank policy', 'Transaction declined by issuing bank'],
  card_expired: ['Card has expired', 'Expired instrument — update required'],
  authentication_failure: ['3DS authentication failed', 'OTP verification timed out', 'Authentication rejected by customer'],
  network_technical: ['Gateway timeout', 'Network connection reset', 'Payment processor error'],
  temporary_bank_issue: ['Issuing bank temporarily unavailable', 'Bank network outage', 'Bank service degraded'],
  unknown: ['Unclassified processor error', 'Unknown failure'],
};

const CAT_WEIGHTS: [string, number][] = [
  ['temporary_bank_issue', 0.22],
  ['network_technical', 0.18],
  ['insufficient_funds', 0.20],
  ['bank_decline', 0.15],
  ['authentication_failure', 0.13],
  ['card_expired', 0.07],
  ['unknown', 0.05],
];

function weightedCategory(): string {
  const r = rand();
  let cum = 0;
  for (const [cat, w] of CAT_WEIGHTS) {
    cum += w;
    if (r <= cum) return cat;
  }
  return 'unknown';
}

function makeAmount(): number {
  const r = rand();
  if (r < 0.5) return Math.round((199 + rand() * 2800) * 100) / 100;
  if (r < 0.8) return Math.round((3000 + rand() * 12000) * 100) / 100;
  if (r < 0.95) return Math.round((15000 + rand() * 35000) * 100) / 100;
  return Math.round((50000 + rand() * 100000) * 100) / 100;
}

function makePhone(): string {
  let p = '+91 ';
  for (let i = 0; i < 10; i++) p += randInt(0, 9);
  return p;
}

export function seedData(): DB {
  _seed = 42; // reset for deterministic output

  const now = new Date();
  const customers: Customer[] = [];
  const payments: Payment[] = [];
  const campaigns: Campaign[] = [];
  const alerts: Alert[] = [];
  const auditLogs: AuditLog[] = [];

  // ── Customers (120) ──
  for (let i = 1; i <= 120; i++) {
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}@${pick(COMPANIES)}.com`;
    const nMethods = randInt(1, 3);
    const methods = [...METHODS].sort(() => rand() - 0.5).slice(0, nMethods);
    const segWeights = [0.2, 0.5, 0.2, 0.1];
    let sr = rand(), seg = 'regular';
    let cum = 0;
    for (let s = 0; s < SEGMENTS.length; s++) {
      cum += segWeights[s];
      if (sr <= cum) { seg = SEGMENTS[s]; break; }
    }
    customers.push({
      id: i, name, email, phone: makePhone(), segment: seg,
      payment_methods: methods,
      created_at: new Date(now.getTime() - randInt(30, 400) * 86400000).toISOString(),
    });
  }

  // ── Payments (600) ──
  for (let i = 1; i <= 600; i++) {
    const cust = pick(customers);
    const amount = makeAmount();
    const method = pick(cust.payment_methods);
    const isFailed = rand() < 0.18;
    const ts = new Date(now.getTime() - randInt(0, 59) * 86400000 - randInt(0, 23) * 3600000);

    let status: string, failureReason: string | null, failureCategory: string | null;
    if (isFailed) {
      const cat = weightedCategory();
      failureCategory = cat;
      failureReason = pick(FAILURE_REASONS[cat]);
      status = 'failed';
    } else {
      status = 'succeeded';
      failureReason = null;
      failureCategory = null;
    }

    payments.push({
      id: `pay_${String(i).padStart(6, '0')}`,
      customer_id: cust.id,
      amount, currency: 'INR', status, method,
      failure_reason: failureReason, failure_category: failureCategory,
      retry_count: 0, created_at: ts.toISOString(), resolved_at: null,
      recovery_probability: null, recommended_action: null, action_reason: null,
      priority: null, expected_recovery: null, risk_level: null,
    });
  }

  // ── Recover ~30% of failed ──
  const failedOnly = payments.filter((p) => p.status === 'failed');
  const recoverCount = Math.floor(failedOnly.length * 0.30);
  // deterministic sample: pick first N after shuffling
  const shuffled = [...failedOnly].sort(() => rand() - 0.5);
  for (let i = 0; i < recoverCount; i++) {
    const p = shuffled[i];
    p.status = 'recovered';
    p.resolved_at = new Date(new Date(p.created_at).getTime() + randInt(1, 48) * 3600000).toISOString();
    p.retry_count = randInt(1, 2);
  }

  // ── Score all remaining failed payments ──
  const db: DB = { payments, customers, campaigns, alerts, auditLogs };
  for (const p of payments) {
    if (p.status === 'failed') {
      const a = analyzePayment(p, db);
      p.recovery_probability = a.recovery_probability;
      p.risk_level = a.risk_level;
      p.priority = a.priority;
      p.expected_recovery = a.expected_recovery;
      p.recommended_action = a.recommended_action;
      p.action_reason = a.action_reason;
    }
  }

  // ── Campaigns ──
  campaigns.push(
    { id: 1, name: 'High-Value Recovery Sprint', type: 'high_value', status: 'completed', targeted: 24, sent: 24, recoveries: 15, revenue_recovered: 285000, created_at: new Date(now.getTime() - 20 * 86400000).toISOString(), conversion_rate: 62.5 },
    { id: 2, name: 'Failed Payment Reminder Wave', type: 'reminder', status: 'completed', targeted: 60, sent: 60, recoveries: 31, revenue_recovered: 142000, created_at: new Date(now.getTime() - 12 * 86400000).toISOString(), conversion_rate: 51.67 },
    { id: 3, name: 'Smart Retry — Temporary Failures', type: 'smart_retry', status: 'active', targeted: 38, sent: 20, recoveries: 11, revenue_recovered: 88000, created_at: new Date(now.getTime() - 3 * 86400000).toISOString(), conversion_rate: 55 },
    { id: 4, name: 'Payment Method Recovery', type: 'method_recovery', status: 'active', targeted: 18, sent: 10, recoveries: 4, revenue_recovered: 36000, created_at: new Date(now.getTime() - 1 * 86400000).toISOString(), conversion_rate: 40 },
  );

  // ── Alerts from high-risk payments ──
  let alertId = 1;
  const highRisk = payments.filter((p) => p.status === 'failed' && p.amount >= 50000 && (p.recovery_probability ?? 0) >= 0.7);
  for (const p of highRisk.slice(0, 5)) {
    alerts.push({
      id: alertId++, severity: 'high', type: 'high_value_at_risk',
      title: 'High-value payment at risk',
      message: `₹${Math.round(p.amount).toLocaleString('en-IN')} payment has ${Math.round((p.recovery_probability ?? 0) * 100)}% recovery probability.`,
      payment_id: p.id, amount: p.amount, read: false,
      timestamp: new Date(now.getTime() - randInt(1, 6) * 3600000).toISOString(),
    });
  }
  const medRisk = payments.filter((p) => p.status === 'failed' && p.amount >= 5000 && (p.recovery_probability ?? 0) >= 0.5 && (p.recovery_probability ?? 0) < 0.7);
  for (const p of medRisk.slice(0, 4)) {
    alerts.push({
      id: alertId++, severity: 'medium', type: 'retry_opportunity',
      title: 'Retry opportunity',
      message: `₹${Math.round(p.amount).toLocaleString('en-IN')} payment can potentially be recovered.`,
      payment_id: p.id, amount: p.amount, read: false,
      timestamp: new Date(now.getTime() - randInt(1, 12) * 3600000).toISOString(),
    });
  }

  // ── Seed a couple audit logs ──
  if (highRisk.length > 0) {
    auditLogs.push({
      id: 1, payment_id: highRisk[0].id, action: 'AI analysis completed',
      ai_recommendation: 'Retry payment in 30 minutes',
      reason: 'Temporary bank issue with high recovery probability',
      result: 'analysis', amount: highRisk[0].amount,
      timestamp: new Date(now.getTime() - 2 * 3600000).toISOString(),
    });
  }

  return db;
}
