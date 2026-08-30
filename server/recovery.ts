import type { DB, Payment } from './types';

// ── Feature engineering (ported from the Python ML model) ──

const CATEGORY_BASE_RATE: Record<string, number> = {
  temporary_bank_issue: 0.82,
  network_technical: 0.74,
  insufficient_funds: 0.58,
  bank_decline: 0.41,
  authentication_failure: 0.36,
  card_expired: 0.18,
  unknown: 0.28,
};

const WEIGHTS = [
  3.2,  // base_rate
  1.8,  // success_ratio
  -1.4, // retry_count (normalized)
  0.6,  // inverse retry
  0.3,  // hours_since_failure
  1.1,  // customer_activity_score
  1.5,  // historical_recovery_rate
  0.7,  // method ease
  0.9,  // small amount bonus
];
const BIAS = -1.6;

function sigmoid(z: number): number {
  if (z >= 0) return 1.0 / (1.0 + Math.exp(-z));
  const ez = Math.exp(z);
  return ez / (1.0 + ez);
}

function methodEase(method: string): number {
  return { upi: 0.9, card: 0.6, netbanking: 0.7, wallet: 0.75 }[method] ?? 0.5;
}

function amountFactor(amount: number): number {
  if (amount < 5000) return 1.0;
  if (amount < 25000) return 0.8;
  return 0.55;
}

function hoursSince(ts: string): number {
  return Math.max(0, (Date.now() - new Date(ts).getTime()) / 3600000);
}

function customerStats(db: DB, customerId: number): { successes: number; failures: number; activity: number } {
  const pays = db.payments.filter((p) => p.customer_id === customerId);
  const successes = pays.filter((p) => p.status === 'succeeded' || p.status === 'recovered').length;
  const failures = pays.filter((p) => p.status === 'failed').length;
  const activity = Math.min(1.0, successes / 10 + 0.1);
  return { successes, failures, activity };
}

function historicalRecoveryRate(db: DB, category: string): number {
  const relevant = db.payments.filter((p) => p.failure_category === category && (p.status === 'failed' || p.status === 'recovered'));
  if (relevant.length === 0) return CATEGORY_BASE_RATE[category] ?? 0.3;
  return relevant.filter((p) => p.status === 'recovered').length / relevant.length;
}

export interface Analysis {
  recovery_probability: number;
  risk_level: string;
  priority: string;
  expected_recovery: number;
  recommended_action: string;
  action_reason: string;
  positive_factors: string[];
  negative_factors: string[];
  failure_explanation: string;
}

export function analyzePayment(payment: Payment, db: DB): Analysis {
  const cat = payment.failure_category || 'unknown';
  const { successes, failures, activity } = customerStats(db, payment.customer_id);
  const histRate = historicalRecoveryRate(db, cat);
  const retries = payment.retry_count ?? 0;
  const hours = hoursSince(payment.created_at);
  const successRatio = successes + failures > 0 ? successes / (successes + failures) : 0.5;
  const baseRate = CATEGORY_BASE_RATE[cat] ?? 0.3;

  const vec = [
    baseRate,
    successRatio,
    Math.min(retries, 5) / 5,
    1 - Math.min(retries, 5) / 5,
    Math.min(hours, 72) / 72,
    activity,
    histRate,
    methodEase(payment.method),
    amountFactor(payment.amount),
  ];

  const z = BIAS + WEIGHTS.reduce((acc, w, i) => acc + w * vec[i], 0);
  const prob = Math.round(Math.max(0.02, Math.min(0.98, sigmoid(z))) * 10000) / 10000;

  const riskLevel = prob >= 0.7 ? 'HIGH' : prob >= 0.4 ? 'MEDIUM' : 'LOW';
  const highValue = payment.amount >= 25000;
  const medValue = payment.amount >= 5000;
  const priority = prob >= 0.7 && highValue ? 'P1' : prob >= 0.7 && medValue ? 'P2' : prob >= 0.4 && highValue ? 'P3' : 'P4';
  const expectedRecovery = Math.round(payment.amount * prob * 100) / 100;

  // Explainability
  const pos: string[] = [];
  const neg: string[] = [];

  if (successes >= 5) pos.push(`Customer has ${successes} previous successful payments`);
  else if (successes > 0) pos.push(`Customer has ${successes} previous successful payment(s)`);
  else neg.push('Customer has no prior successful payment history');

  if (failures >= 3) neg.push(`${failures} previous failures — customer may be disengaged`);

  if (cat === 'temporary_bank_issue' || cat === 'network_technical') pos.push(`Failure is temporary (${cat.replace(/_/g, ' ')}) — historically recoverable`);
  else if (cat === 'card_expired') neg.push('Card expired — requires customer action to update instrument');
  else if (cat === 'authentication_failure') neg.push('Authentication failure — may need re-auth or alternate method');
  else if (cat === 'bank_decline') neg.push('Hard bank decline — recovery depends on issuer');

  if (retries === 0) pos.push('No retries attempted yet — fresh opportunity');
  else if (retries >= 2) neg.push(`${retries} retries already attempted`);

  if (payment.amount < 5000) pos.push('Low transaction amount — higher recovery likelihood');
  else if (payment.amount >= 25000) neg.push('High-value transaction — customer sensitivity is higher');

  if (activity >= 0.7) pos.push('Customer is actively engaged on the platform');
  else if (activity < 0.3) neg.push('Low recent customer activity');

  if (histRate >= 0.6) pos.push(`Similar failures recovered ${Math.round(histRate * 100)}% of the time`);
  else if (histRate < 0.35) neg.push(`Similar failures recovered only ${Math.round(histRate * 100)}% of the time`);

  const [action, reason] = recommendAction(cat, retries, prob);
  const failureExplanation = explainFailure(payment);

  return {
    recovery_probability: prob,
    risk_level: riskLevel,
    priority,
    expected_recovery: expectedRecovery,
    recommended_action: action,
    action_reason: reason,
    positive_factors: pos,
    negative_factors: neg,
    failure_explanation: failureExplanation,
  };
}

export function explainFailure(payment: Payment): string {
  const cat = payment.failure_category || 'unknown';
  const reason = payment.failure_reason || 'Unknown error';
  const mapping: Record<string, string> = {
    insufficient_funds: `Payment failed because the customer's account had insufficient balance. (${reason})`,
    bank_decline: `The issuing bank declined the transaction. (${reason})`,
    card_expired: `The card used has expired and cannot be charged. (${reason})`,
    authentication_failure: `Payment authentication (3DS/OTP) failed or timed out. (${reason})`,
    network_technical: `A network or technical error interrupted the payment. (${reason})`,
    temporary_bank_issue: `The issuing bank is experiencing a temporary outage. (${reason})`,
    unknown: `The payment failed for an unclassified reason. (${reason})`,
  };
  return mapping[cat] ?? reason;
}

export function recommendAction(cat: string, retries: number, prob: number): [string, string] {
  if (cat === 'card_expired') {
    return [
      'Ask customer to update card / use another payment method',
      'Card has expired — retrying the same instrument will fail again. Customer must provide a valid payment method.',
    ];
  }
  if (cat === 'authentication_failure') {
    if (retries >= 2) {
      return [
        'Send payment link with re-authentication',
        `${retries} authentication failures — a fresh payment link with simplified auth gives the best chance of recovery.`,
      ];
    }
    return ['Request re-authentication', 'Authentication failed once — a re-authentication attempt is likely to succeed.'];
  }
  if (cat === 'temporary_bank_issue' || cat === 'network_technical') {
    if (retries === 0) {
      return [
        'Retry payment in 30 minutes',
        `Temporary ${cat.replace(/_/g, ' ')} with ${Math.round(prob * 100)}% recovery probability — retrying after a short delay historically recovers well.`,
      ];
    }
    return [
      'Send payment reminder + retry',
      `Temporary failure persists after ${retries} retries — a customer nudge combined with a retry maximizes recovery.`,
    ];
  }
  if (cat === 'insufficient_funds') {
    return [
      'Send payment reminder (end of day)',
      'Insufficient funds often resolve within the day — a reminder timed to salary/credit windows improves recovery.',
    ];
  }
  if (cat === 'bank_decline') {
    if (prob >= 0.5) return ['Retry after 2 hours', 'Hard decline but customer history suggests a delayed retry may succeed.'];
    return ['Escalate to merchant', 'Hard bank decline with low recovery probability — merchant intervention or alternate method needed.'];
  }
  return ['Send payment link', 'Unclassified failure — a fresh payment link lets the customer retry with the latest instruments.'];
}
