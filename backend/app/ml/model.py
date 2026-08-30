"""Transparent logistic recovery-probability model.

We use a hand-weighted logistic regression so every prediction is explainable:
probability = sigmoid(w · x + b). No black box — each weight maps to a human-
readable factor. This is a real, deterministic ML model (logistic regression),
not a random number generator.
"""
import math
from typing import Tuple, List
from app.ml.features import WEIGHTS, BIAS


def _sigmoid(z: float) -> float:
    if z >= 0:
        return 1.0 / (1.0 + math.exp(-z))
    ez = math.exp(z)
    return ez / (1.0 + ez)


def predict_probability(feature_vec: list) -> float:
    z = BIAS + sum(w * x for w, x in zip(WEIGHTS, feature_vec))
    p = _sigmoid(z)
    return round(max(0.02, min(0.98, p)), 4)


def risk_level(prob: float) -> str:
    if prob >= 0.70:
        return "HIGH"
    if prob >= 0.40:
        return "MEDIUM"
    return "LOW"


def priority_tier(prob: float, amount: float) -> str:
    """P1: high prob + high value; P2: high prob + med; P3: med prob + high; P4: low."""
    high_value = amount >= 25000
    med_value = amount >= 5000
    if prob >= 0.70 and high_value:
        return "P1"
    if prob >= 0.70 and med_value:
        return "P2"
    if prob >= 0.40 and high_value:
        return "P3"
    return "P4"


def explain(
    features: dict,
    feature_vec: list,
    prob: float,
) -> Tuple[List[str], List[str]]:
    """Return (positive_factors, negative_factors) explaining the score."""
    pos, neg = [], []

    # success history
    if features["prev_successes"] >= 5:
        pos.append(f"Customer has {features['prev_successes']} previous successful payments")
    elif features["prev_successes"] > 0:
        pos.append(f"Customer has {features['prev_successes']} previous successful payment(s)")
    else:
        neg.append("Customer has no prior successful payment history")

    if features["prev_failures"] >= 3:
        neg.append(f"{features['prev_failures']} previous failures — customer may be disengaged")

    # failure category
    cat = features["failure_category"]
    if cat in ("temporary_bank_issue", "network_technical"):
        pos.append(f"Failure is temporary ({cat.replace('_', ' ')}) — historically recoverable")
    elif cat in ("card_expired",):
        neg.append("Card expired — requires customer action to update instrument")
    elif cat in ("authentication_failure",):
        neg.append("Authentication failure — may need re-auth or alternate method")
    elif cat in ("bank_decline",):
        neg.append("Hard bank decline — recovery depends on issuer")

    # retries
    if features["retry_count"] == 0:
        pos.append("No retries attempted yet — fresh opportunity")
    elif features["retry_count"] >= 2:
        neg.append(f"{features['retry_count']} retries already attempted")

    # amount
    if features["amount"] < 5000:
        pos.append("Low transaction amount — higher recovery likelihood")
    elif features["amount"] >= 25000:
        neg.append("High-value transaction — customer sensitivity is higher")

    # activity
    if features["customer_activity_score"] >= 0.7:
        pos.append("Customer is actively engaged on the platform")
    elif features["customer_activity_score"] < 0.3:
        neg.append("Low recent customer activity")

    # historical recovery rate
    if features["historical_recovery_rate"] >= 0.6:
        pos.append(f"Similar failures recovered {int(features['historical_recovery_rate']*100)}% of the time")
    elif features["historical_recovery_rate"] < 0.35:
        neg.append(f"Similar failures recovered only {int(features['historical_recovery_rate']*100)}% of the time")

    return pos, neg
