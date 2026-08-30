"""Feature engineering for the recovery probability model."""
from typing import Optional


FAILURE_CATEGORIES = [
    "insufficient_funds",
    "bank_decline",
    "card_expired",
    "authentication_failure",
    "network_technical",
    "temporary_bank_issue",
    "unknown",
]

# Historical recovery base rates by failure category (domain-tuned priors).
# These act as the "training" of a transparent logistic model — each category
# has a different base recovery likelihood derived from industry patterns.
CATEGORY_BASE_RATE = {
    "temporary_bank_issue": 0.82,
    "network_technical": 0.74,
    "insufficient_funds": 0.58,
    "bank_decline": 0.41,
    "authentication_failure": 0.36,
    "card_expired": 0.18,
    "unknown": 0.28,
}


def build_features(
    amount: float,
    method: str,
    failure_category: str,
    retry_count: int,
    prev_successes: int,
    prev_failures: int,
    hours_since_failure: float,
    customer_activity_score: float,
    historical_recovery_rate: float,
) -> dict:
    """Return a feature dict used by the scoring model."""
    return {
        "amount": amount,
        "log_amount": min(float(amount), 1.0) if amount <= 0 else (amount if amount < 1 else amount),
        "method": method,
        "failure_category": failure_category,
        "retry_count": retry_count,
        "prev_successes": prev_successes,
        "prev_failures": prev_failures,
        "success_ratio": (prev_successes / (prev_successes + prev_failures)) if (prev_successes + prev_failures) > 0 else 0.5,
        "hours_since_failure": hours_since_failure,
        "customer_activity_score": customer_activity_score,
        "historical_recovery_rate": historical_recovery_rate,
        "base_rate": CATEGORY_BASE_RATE.get(failure_category, 0.30),
    }


def feature_vector(f: dict) -> list:
    """Numeric vector for the logistic model (order matters)."""
    method_map = {"upi": 0.9, "card": 0.6, "netbanking": 0.7, "wallet": 0.75}
    return [
        f["base_rate"],
        f["success_ratio"],
        min(f["retry_count"], 5) / 5.0,            # more retries -> lower
        1.0 - min(f["retry_count"], 5) / 5.0,
        min(f["hours_since_failure"], 72) / 72.0,  # sooner retry slightly better, capped
        f["customer_activity_score"],
        f["historical_recovery_rate"],
        method_map.get(f["method"], 0.5),
        1.0 if f["amount"] < 5000 else (0.8 if f["amount"] < 25000 else 0.55),  # smaller amounts recover more
    ]


# Transparent logistic weights — hand-tuned to be explainable.
# Positive weight => increases recovery probability.
WEIGHTS = [
    3.2,   # base_rate (category prior)
    1.8,   # success_ratio
    -1.4,  # retry_count (normalized)
    0.6,   # inverse retry
    0.3,   # hours_since_failure
    1.1,   # customer_activity_score
    1.5,   # historical_recovery_rate
    0.7,   # method ease
    0.9,   # small amount bonus
]
BIAS = -1.6
