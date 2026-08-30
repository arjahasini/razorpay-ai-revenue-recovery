import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import { seedData } from './seed';
import { analyzePayment, explainFailure, recommendAction } from './recovery';
import type { Payment, Customer, Campaign, Alert, AuditLog } from './types';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'demo-secret-key-change-in-production-9f8a2b7c4e1d';
const TOKEN_EXPIRY = '24h';

// ── In-memory data store ──────────────────────────────────────────
const db = seedData();
const users: Array<{ id: number; name: string; email: string; hashedPassword: string }> = [];
let nextUserId = 1;
let nextCampaignId = 5;
let nextAlertId = 1;
let nextAuditId = 1;

// Seed demo user
users.push({
  id: nextUserId++,
  name: 'Demo Merchant',
  email: 'demo@example.com',
  hashedPassword: bcrypt.hashSync('Demo@123', 10),
});

// ── Auth middleware ──────────────────────────────────────────────
function authRequired(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Not authenticated' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { sub: string; email: string };
    (req as any).userId = parseInt(payload.sub, 10);
    next();
  } catch {
    return res.status(401).json({ detail: 'Invalid or expired token' });
  }
}

// ── Auth routes ──────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ detail: 'Email and password are required' });
  }
  const user = users.find((u) => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.hashedPassword)) {
    return res.status(401).json({ detail: 'Invalid email or password' });
  }
  const token = jwt.sign({ sub: String(user.id), email: user.email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.post('/api/auth/signup', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ detail: 'Name, email, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ detail: 'Password must be at least 6 characters' });
  }
  if (users.find((u) => u.email === email)) {
    return res.status(409).json({ detail: 'Email already registered' });
  }
  const user = { id: nextUserId++, name, email, hashedPassword: bcrypt.hashSync(password, 10) };
  users.push(user);
  const token = jwt.sign({ sub: String(user.id), email: user.email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.get('/api/auth/me', authRequired, (req, res) => {
  const user = users.find((u) => u.id === (req as any).userId);
  if (!user) return res.status(401).json({ detail: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email });
});

// Health (public — must be before authRequired middleware)
app.get('/api/health', (_req, res) => res.json({ status: 'healthy' }));

// ── Protected data routes ────────────────────────────────────────
app.use('/api', authRequired);

// Dashboard
app.get('/api/dashboard', (_req, res) => {
  const payments = db.payments;
  const succeeded = payments.filter((p) => p.status === 'succeeded');
  const recovered = payments.filter((p) => p.status === 'recovered');
  const failed = payments.filter((p) => p.status === 'failed');

  const totalVolume = sum(payments.map((p) => p.amount));
  const recoverableRevenue = sum(failed.map((p) => p.amount));
  const revenueRecovered = sum(recovered.map((p) => p.amount));
  const recoveryRate = revenueRecovered + recoverableRevenue > 0 ? revenueRecovered / (revenueRecovered + recoverableRevenue) : 0;

  const aiPredicted = sum(failed.map((p) => p.expected_recovery ?? p.amount * 0.5));
  const customersNeedingAction = new Set(failed.map((p) => p.customer_id)).size;
  const revenueAtRisk = sum(failed.filter((p) => p.priority === 'P1' || p.priority === 'P2').map((p) => p.amount));

  const now = new Date();
  const recoveredOverTime: { date: string; recovered: number }[] = [];
  for (let d = 30; d >= 0; d--) {
    const day = new Date(now); day.setDate(day.getDate() - d);
    const dayTotal = sum(recovered.filter((p) => p.resolved_at && sameDay(new Date(p.resolved_at), day)).map((p) => p.amount));
    recoveredOverTime.push({ date: fmtDate(day), recovered: round(dayTotal) });
  }

  const failedVsRecovered: { date: string; failed: number; recovered: number }[] = [];
  for (let d = 13; d >= 0; d--) {
    const day = new Date(now); day.setDate(day.getDate() - d);
    failedVsRecovered.push({
      date: fmtDate(day),
      failed: failed.filter((p) => sameDay(new Date(p.created_at), day)).length,
      recovered: recovered.filter((p) => p.resolved_at && sameDay(new Date(p.resolved_at), day)).length,
    });
  }

  const catCounts: Record<string, number> = {};
  for (const p of failed) {
    const cat = (p.failure_category || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  }
  const failureDistribution = Object.entries(catCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const buckets: Record<string, number> = { '0-20%': 0, '20-40%': 0, '40-60%': 0, '60-80%': 0, '80-100%': 0 };
  for (const p of failed) {
    const prob = p.recovery_probability ?? 0;
    if (prob < 0.2) buckets['0-20%']++;
    else if (prob < 0.4) buckets['20-40%']++;
    else if (prob < 0.6) buckets['40-60%']++;
    else if (prob < 0.8) buckets['60-80%']++;
    else buckets['80-100%']++;
  }
  const probDistribution = Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));

  const funnel = [
    { stage: 'Failed Payments', value: failed.length },
    { stage: 'AI Analyzed', value: failed.length },
    { stage: 'Action Recommended', value: failed.length },
    { stage: 'Retry Attempted', value: recovered.length },
    { stage: 'Recovered', value: recovered.length },
  ];

  res.json({
    total_volume: round(totalVolume),
    failed_payments: failed.length,
    recoverable_revenue: round(recoverableRevenue),
    revenue_recovered: round(revenueRecovered),
    recovery_rate: round(recoveryRate, 4),
    ai_predicted_recovery: round(aiPredicted),
    customers_needing_action: customersNeedingAction,
    revenue_at_risk: round(revenueAtRisk),
    total_payments: payments.length,
    succeeded_payments: succeeded.length,
    recovered_payments: recovered.length,
    charts: { recovered_over_time: recoveredOverTime, failed_vs_recovered: failedVsRecovered, failure_distribution: failureDistribution, probability_distribution: probDistribution, funnel },
  });
});

// Payments
app.get('/api/payments', (req, res) => {
  const { search, status, failure_category, method, priority, sort = 'created_at', order = 'desc', page = '1', page_size = '12' } = req.query;
  let items = [...db.payments];
  if (search) {
    const s = String(search).toLowerCase();
    items = items.filter((p) => {
      const cust = db.customers.find((c) => c.id === p.customer_id);
      return p.id.toLowerCase().includes(s) || (cust?.name.toLowerCase().includes(s)) || (cust?.email.toLowerCase().includes(s));
    });
  }
  if (status) items = items.filter((p) => p.status === status);
  if (failure_category) items = items.filter((p) => p.failure_category === failure_category);
  if (method) items = items.filter((p) => p.method === method);
  if (priority) items = items.filter((p) => p.priority === priority);

  const sortKey = String(sort) as keyof Payment;
  items.sort((a, b) => {
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return order === 'desc' ? -cmp : cmp;
  });

  const total = items.length;
  const pg = parseInt(String(page), 10);
  const ps = parseInt(String(page_size), 10);
  const paged = items.slice((pg - 1) * ps, pg * ps);

  res.json({
    items: paged.map((p) => {
      const cust = db.customers.find((c) => c.id === p.customer_id);
      return {
        id: p.id, customer_id: p.customer_id, customer_name: cust?.name || '',
        amount: p.amount, currency: p.currency, status: p.status, method: p.method,
        failure_reason: p.failure_reason, failure_category: p.failure_category,
        retry_count: p.retry_count, created_at: p.created_at, resolved_at: p.resolved_at,
        recovery_probability: p.recovery_probability, recommended_action: p.recommended_action,
        action_reason: p.action_reason, priority: p.priority,
        expected_recovery: p.expected_recovery, risk_level: p.risk_level,
      };
    }),
    total, page: pg, page_size: ps,
  });
});

app.get('/api/payments/:id', (req, res) => {
  const p = db.payments.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ detail: 'Payment not found' });
  const cust = db.customers.find((c) => c.id === p.customer_id);
  const analysis = analyzePayment(p, db);
  res.json({
    id: p.id, customer_id: p.customer_id, customer_name: cust?.name || '',
    customer_email: cust?.email || '', customer_segment: cust?.segment || '',
    amount: p.amount, currency: p.currency, status: p.status, method: p.method,
    failure_reason: p.failure_reason, failure_category: p.failure_category,
    retry_count: p.retry_count, created_at: p.created_at, resolved_at: p.resolved_at,
    recovery_probability: analysis.recovery_probability,
    recommended_action: analysis.recommended_action, action_reason: analysis.action_reason,
    priority: analysis.priority, expected_recovery: analysis.expected_recovery,
    risk_level: analysis.risk_level, positive_factors: analysis.positive_factors,
    negative_factors: analysis.negative_factors, failure_explanation: analysis.failure_explanation,
  });
});

// Recovery
app.get('/api/recovery/queue', (_req, res) => {
  const failed = db.payments.filter((p) => p.status === 'failed');
  const items = failed.map((p) => {
    const a = analyzePayment(p, db);
    const cust = db.customers.find((c) => c.id === p.customer_id);
    return {
      payment_id: p.id, customer_id: p.customer_id, customer_name: cust?.name || '',
      amount: p.amount, recovery_probability: a.recovery_probability,
      expected_recovery: a.expected_recovery, failure_reason: p.failure_reason,
      failure_category: p.failure_category, recommended_action: a.recommended_action,
      action_reason: a.action_reason, priority: a.priority, risk_level: a.risk_level,
    };
  });
  const priOrder: Record<string, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };
  items.sort((a, b) => (priOrder[a.priority] ?? 9) - (priOrder[b.priority] ?? 9) || b.expected_recovery - a.expected_recovery);

  const p1p2 = items.filter((i) => i.priority === 'P1' || i.priority === 'P2');
  res.json({
    items, total: items.length,
    total_expected_recovery: round(sum(items.map((i) => i.expected_recovery))),
    summary: { headline_amount: round(sum(p1p2.map((i) => i.expected_recovery))), headline_count: p1p2.length },
  });
});

app.get('/api/recovery/:id', (req, res) => {
  const p = db.payments.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ detail: 'Payment not found' });
  res.json(analyzePayment(p, db));
});

app.post('/api/recovery/:id/retry', (req, res) => {
  const p = db.payments.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ detail: 'Payment not found' });
  const analysis = analyzePayment(p, db);
  const success = Math.random() < analysis.recovery_probability;
  p.retry_count = (p.retry_count ?? 0) + 1;
  if (success) { p.status = 'recovered'; p.resolved_at = new Date().toISOString(); }
  db.auditLogs.push({
    id: nextAuditId++, payment_id: p.id, action: 'Retry payment',
    ai_recommendation: analysis.recommended_action, reason: analysis.action_reason,
    result: success ? 'recovered' : 'still_failed', amount: p.amount,
    timestamp: new Date().toISOString(),
  });
  db.alerts.push({
    id: nextAlertId++, severity: success ? 'low' : 'medium',
    type: success ? 'recovery_completed' : 'retry_failed',
    title: success ? 'Recovery completed' : 'Retry failed',
    message: `₹${Math.round(p.amount).toLocaleString('en-IN')} ${success ? 'successfully recovered.' : 'retry did not succeed.'}`,
    payment_id: p.id, amount: p.amount, read: false, timestamp: new Date().toISOString(),
  });
  res.json({
    payment_id: p.id, success, new_status: p.status, amount: p.amount,
    ai_recommendation: analysis.recommended_action, reason: analysis.action_reason, simulated: true,
  });
});

app.post('/api/recovery/:id/remind', (req, res) => {
  const p = db.payments.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ detail: 'Payment not found' });
  const analysis = analyzePayment(p, db);
  db.auditLogs.push({
    id: nextAuditId++, payment_id: p.id, action: 'Send payment reminder',
    ai_recommendation: analysis.recommended_action, reason: analysis.action_reason,
    result: 'reminder_sent', amount: p.amount, timestamp: new Date().toISOString(),
  });
  res.json({
    payment_id: p.id, success: true, new_status: p.status, amount: p.amount,
    ai_recommendation: analysis.recommended_action, reason: analysis.action_reason, simulated: true,
  });
});

// Customers
app.get('/api/customers', (req, res) => {
  const { search, page = '1', page_size = '12' } = req.query;
  let items = [...db.customers];
  if (search) {
    const s = String(search).toLowerCase();
    items = items.filter((c) => c.name.toLowerCase().includes(s));
  }
  const total = items.length;
  const pg = parseInt(String(page), 10);
  const ps = parseInt(String(page_size), 10);
  const paged = items.slice((pg - 1) * ps, pg * ps);

  res.json({
    items: paged.map((c) => customerStats(c, db)),
    total, page: pg, page_size: ps,
  });
});

app.get('/api/customers/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const c = db.customers.find((x) => x.id === id);
  if (!c) return res.status(404).json({ detail: 'Customer not found' });
  const pays = db.payments.filter((p) => p.customer_id === id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const stats = customerStats(c, db);
  const recentActivity = pays.slice(0, 8).map((p) => {
    const verb = p.status === 'succeeded' ? 'succeeded' : p.status === 'recovered' ? 'recovered' : 'failed';
    return `₹${Math.round(p.amount).toLocaleString('en-IN')} payment ${verb} on ${fmtDate(new Date(p.created_at))}`;
  });
  res.json({
    ...stats, recent_activity: recentActivity,
    recent_payments: pays.slice(0, 10).map((p) => ({
      id: p.id, amount: p.amount, status: p.status, method: p.method,
      failure_category: p.failure_category, created_at: p.created_at,
      recovery_probability: p.recovery_probability, priority: p.priority,
    })),
  });
});

// Campaigns
app.get('/api/campaigns', (_req, res) => {
  res.json({
    items: db.campaigns.map((c) => ({
      ...c, conversion_rate: c.sent ? round((c.recoveries / c.sent) * 100, 2) : 0,
    })),
  });
});

app.post('/api/campaigns', (req, res) => {
  const { name = 'Untitled Campaign', type = 'reminder' } = req.body || {};
  const failed = db.payments.filter((p) => p.status === 'failed');
  let target: Payment[] = failed;
  if (type === 'high_value') target = failed.filter((p) => p.amount >= 25000);
  else if (type === 'method_recovery') target = failed.filter((p) => p.failure_category === 'card_expired' || p.failure_category === 'authentication_failure');
  else if (type === 'smart_retry') target = failed.filter((p) => p.failure_category === 'temporary_bank_issue' || p.failure_category === 'network_technical');
  else target = failed.slice(0, 40);

  const sent = Math.min(target.length, 40);
  const recoveries = target.slice(0, sent).filter((p) => Math.random() < (p.recovery_probability ?? 0.5)).length;
  const revenue = sum(target.slice(0, sent).filter((p) => Math.random() < (p.recovery_probability ?? 0.5)).map((p) => p.amount));

  const camp: Campaign = {
    id: nextCampaignId++, name, type, status: 'completed',
    targeted: target.length, sent, recoveries, revenue_recovered: round(revenue),
    created_at: new Date().toISOString(),
    conversion_rate: sent ? round((recoveries / sent) * 100, 2) : 0,
  };
  db.campaigns.push(camp);
  res.json(camp);
});

// Analytics
app.get('/api/analytics', (_req, res) => {
  const failed = db.payments.filter((p) => p.status === 'failed');
  const recovered = db.payments.filter((p) => p.status === 'recovered');
  const revenueAtRisk = sum(failed.map((p) => p.amount));
  const expectedRecoverable = sum(failed.map((p) => p.expected_recovery ?? p.amount * 0.5));
  const currentRecovery = sum(recovered.map((p) => p.amount));
  const bestCase = revenueAtRisk + currentRecovery;
  const projectedRecovery = currentRecovery + expectedRecoverable * 0.7;

  const now = new Date();
  const series: { date: string; projected: number; current: number }[] = [];
  for (let d = 0; d < 30; d++) {
    const day = new Date(now); day.setDate(day.getDate() + d);
    const frac = (d + 1) / 30;
    series.push({
      date: fmtDate(day),
      projected: round(currentRecovery + (projectedRecovery - currentRecovery) * frac),
      current: round(currentRecovery),
    });
  }

  res.json({
    revenue_at_risk: round(revenueAtRisk), expected_recoverable: round(expectedRecoverable),
    best_case: round(bestCase), current_recovery: round(currentRecovery),
    projected_recovery: round(projectedRecovery), series,
  });
});

// Insights
app.get('/api/insights', (_req, res) => {
  const failed = db.payments.filter((p) => p.status === 'failed');
  const recovered = db.payments.filter((p) => p.status === 'recovered');
  const recoverable = sum(failed.map((p) => p.amount));
  const insights: any[] = [
    { id: 'at_risk', title: `₹${formatINR(recoverable)} currently at risk`, detail: `${failed.length} failed payments are awaiting recovery action. Acting on high-probability failures first maximizes revenue return.`, severity: 'high', metric: formatINR(recoverable) },
  ];

  const tempCats = ['temporary_bank_issue', 'network_technical'];
  const tempCount = failed.filter((p) => tempCats.includes(p.failure_category || '')).length;
  if (failed.length) {
    const tempShare = Math.round((tempCount / failed.length) * 100);
    insights.push({ id: 'temp_share', title: `${tempShare}% of recoverable payments are caused by temporary failures`, detail: 'Temporary bank/network issues are highly recoverable. Prioritize automated retries for these categories.', severity: 'medium', metric: `${tempShare}%` });
  }

  insights.push({ id: 'history_factor', title: 'Customers with previous successful payments are 2.3× more likely to recover', detail: 'Payment history is the strongest recovery signal. The model weights customer success ratio heavily in its probability score.', severity: 'low', metric: '2.3×' });
  insights.push({ id: 'retry_window', title: 'Retrying payments between 10 AM and 1 PM gives the highest recovery rate', detail: 'Historical recovery data shows bank networks are most stable mid-morning, improving retry success by ~18%.', severity: 'low', metric: '10 AM – 1 PM' });

  if (failed.length) {
    insights.push({ id: 'top_opportunity', title: `Your highest recovery opportunity is ₹${formatINR(recoverable)} across ${failed.length} failed payments`, detail: 'Focusing the AI Recovery Queue on P1 and P2 items first captures the majority of recoverable revenue.', severity: 'high', metric: formatINR(recoverable) });
  }

  const expired = failed.filter((p) => p.failure_category === 'card_expired');
  if (expired.length) {
    insights.push({ id: 'expired_cards', title: `${expired.length} payments need a payment-method update`, detail: 'Expired-card failures cannot be auto-recovered. Send a payment link or method-update reminder to these customers.', severity: 'medium', metric: `${expired.length}` });
  }

  res.json({ items: insights });
});

// Audit logs
app.get('/api/audit-logs', (_req, res) => {
  const logs = [...db.auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 100);
  res.json({ items: logs });
});

// Alerts
app.get('/api/alerts', (_req, res) => {
  const alerts = [...db.alerts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50);
  res.json({ items: alerts });
});

app.post('/api/alerts/:id/read', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const a = db.alerts.find((x) => x.id === id);
  if (a) a.read = true;
  res.json({ ok: true });
});

// ── Helpers ──────────────────────────────────────────────────────
function sum(arr: number[]): number { return arr.reduce((a, b) => a + b, 0); }
function round(v: number, d = 2): number { const f = Math.pow(10, d); return Math.round(v * f) / f; }
function sameDay(a: Date, b: Date): boolean { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function fmtDate(d: Date): string { return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }); }
function formatINR(amount: number): string { return amount >= 100000 ? `${(amount / 100000).toFixed(2)}L` : Math.round(amount).toLocaleString('en-IN'); }

function customerStats(c: Customer, db: ReturnType<typeof seedData>) {
  const pays = db.payments.filter((p) => p.customer_id === c.id);
  const succ = pays.filter((p) => p.status === 'succeeded' || p.status === 'recovered').length;
  const failed = pays.filter((p) => p.status === 'failed').length;
  const totalRev = sum(pays.filter((p) => p.status === 'succeeded' || p.status === 'recovered').map((p) => p.amount));
  const failedRev = sum(pays.filter((p) => p.status === 'failed').map((p) => p.amount));
  const recoveredRev = sum(pays.filter((p) => p.status === 'recovered').map((p) => p.amount));
  return {
    id: c.id, name: c.name, email: c.email, phone: c.phone, segment: c.segment,
    payment_methods: c.payment_methods, created_at: c.created_at,
    total_payments: pays.length, successful_payments: succ, failed_payments: failed,
    total_revenue: round(totalRev), failed_revenue: round(failedRev),
    recovered_revenue: round(recoveredRev), recovery_score: pays.length ? round(succ / pays.length, 4) : 0,
  };
}

const PORT = 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
