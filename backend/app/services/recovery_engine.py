"""Recovery engine — orchestrates feature building, scoring, and recommendations."""
from datetime import datetime
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session

from app.models import Payment, Customer
from app.ml.features import build_features, feature_vector, CATEGORY_BASE_RATE
from app.ml.model import predict_probability, risk_level, priority_tier, explain


def _hours_since(ts: datetime) -> float:
    return max(0.0, (datetime.utcnow() - ts).total_seconds() / 3600.0)


def _historical_recovery_rate(db: Session, failure_category: str) -> float:
    """Recovery rate for similar failures across the dataset."""
    total = db.query(Payment).filter(
        Payment.failure_category == failure_category,
        Payment.status.in_(["failed", "recovered"]),
    ).count()
    if total == 0:
        return CATEGORY_BASE_RATE.get(failure_category, 0.30)
    recovered = db.query(Payment).filter(
        Payment.failure_category == failure_category,
        Payment.status == "recovered",
    ).count()
    return recovered / total


def _customer_stats(db: Session, customer_id: int) -> Tuple[int, int, float]:
    pays = db.query(Payment).filter(Payment.customer_id == customer_id).all()
    successes = sum(1 for p in pays if p.status in ("succeeded", "recovered"))
    failures = sum(1 for p in pays if p.status == "failed")
    activity = min(1.0, successes / 10.0 + 0.1)
    return successes, failures, activity


def analyze_payment(db: Session, payment: Payment) -> dict:
    """Compute recovery probability, risk, priority, recommendation, and explanations."""
    customer = db.query(Customer).filter(Customer.id == payment.customer_id).first()
    prev_successes, prev_failures, activity = _customer_stats(db, payment.customer_id)
    hist_rate = _historical_recovery_rate(db, payment.failure_category or "unknown")

    features = build_features(
        amount=payment.amount,
        method=payment.method,
        failure_category=payment.failure_category or "unknown",
        retry_count=payment.retry_count or 0,
        prev_successes=prev_successes,
        prev_failures=prev_failures,
        hours_since_failure=_hours_since(payment.created_at),
        customer_activity_score=activity,
        historical_recovery_rate=hist_rate,
    )
    vec = feature_vector(features)
    prob = predict_probability(vec)
    rl = risk_level(prob)
    pri = priority_tier(prob, payment.amount)
    pos, neg = explain(features, vec, prob)

    action, reason = recommend_action(payment, features, prob)

    return {
        "recovery_probability": prob,
        "risk_level": rl,
        "priority": pri,
        "expected_recovery": round(payment.amount * prob, 2),
        "recommended_action": action,
        "action_reason": reason,
        "positive_factors": pos,
        "negative_factors": neg,
        "failure_explanation": explain_failure(payment),
    }


def explain_failure(payment: Payment) -> str:
    """Human-readable explanation of why the payment failed."""
    cat = payment.failure_category or "unknown"
    reason = payment.failure_reason or "Unknown error"
    mapping = {
        "insufficient_funds": f"Payment failed because the customer's account had insufficient balance. ({reason})",
        "bank_decline": f"The issuing bank declined the transaction. ({reason})",
        "card_expired": f"The card used has expired and cannot be charged. ({reason})",
        "authentication_failure": f"Payment authentication (3DS/OTP) failed or timed out. ({reason})",
        "network_technical": f"A network or technical error interrupted the payment. ({reason})",
        "temporary_bank_issue": f"The issuing bank is experiencing a temporary outage. ({reason})",
        "unknown": f"The payment failed for an unclassified reason. ({reason})",
    }
    return mapping.get(cat, reason)


def recommend_action(payment: Payment, features: dict, prob: float) -> Tuple[str, str]:
    """Rule-based, explainable action selection driven by failure category + probability."""
    cat = features["failure_category"]
    retries = features["retry_count"]

    if cat == "card_expired":
        return (
            "Ask customer to update card / use another payment method",
            "Card has expired — retrying the same instrument will fail again. Customer must provide a valid payment method.",
        )
    if cat == "authentication_failure":
        if retries >= 2:
            return (
                "Send payment link with re-authentication",
                f"{retries} authentication failures — a fresh payment link with simplified auth gives the best chance of recovery.",
            )
        return (
            "Request re-authentication",
            "Authentication failed once — a re-authentication attempt is likely to succeed.",
        )
    if cat in ("temporary_bank_issue", "network_technical"):
        if retries == 0:
            return (
                "Retry payment in 30 minutes",
                f"Temporary {cat.replace('_', ' ')} with {int(prob*100)}% recovery probability — retrying after a short delay historically recovers well.",
            )
        return (
            "Send payment reminder + retry",
            f"Temporary failure persists after {retries} retries — a customer nudge combined with a retry maximizes recovery.",
        )
    if cat == "insufficient_funds":
        return (
            "Send payment reminder (end of day)",
            "Insufficient funds often resolve within the day — a reminder timed to salary/credit windows improves recovery.",
        )
    if cat == "bank_decline":
        if prob >= 0.5:
            return (
                "Retry after 2 hours",
                "Hard decline but customer history suggests a delayed retry may succeed.",
            )
        return (
            "Escalate to merchant",
            "Hard bank decline with low recovery probability — merchant intervention or alternate method needed.",
        )
    return (
        "Send payment link",
        "Unclassified failure — a fresh payment link lets the customer retry with the latest instruments.",
    )
