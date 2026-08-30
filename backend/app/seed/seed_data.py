"""Generate realistic synthetic payment data for the demo.

Produces 120 customers, 600 payments (100+ failed) with INR amounts,
realistic failure categories, and timestamps over the last 60 days.
Idempotent: wipes tables before seeding.
"""
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models import Customer, Payment, AuditLog, Campaign, Alert
from app.services.recovery_engine import analyze_payment

random.seed(42)

FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Krishna",
    "Ishaan", "Rohan", "Ananya", "Diya", "Saanvi", "Aadhya", "Kiara", "Myra",
    "Sara", "Anika", "Riya", "Navya", "Kabir", "Dhruv", "Aryan", "Rahul",
    "Priya", "Neha", "Pooja", "Shreya", "Karan", "Varun", "Nikhil", "Tanvi",
]
LAST_NAMES = [
    "Sharma", "Verma", "Patel", "Reddy", "Nair", "Iyer", "Gupta", "Singh",
    "Mehta", "Joshi", "Rao", "Das", "Kumar", "Malhotra", "Bose", "Chopra",
    "Kapoor", "Khanna", "Banerjee", "Pillai", "Menon", "Agarwal", "Shah", "Bhat",
]
COMPANIES = ["Acme", "Globex", "Initech", "Umbrella", "Stark", "Wayne", "Hooli", "Pied Piper"]
SEGMENTS = ["premium", "regular", "new", "at-risk"]
METHODS = ["upi", "card", "netbanking", "wallet"]

FAILURE_REASONS = {
    "insufficient_funds": [
        "Insufficient balance in account",
        "Customer account has insufficient funds",
    ],
    "bank_decline": [
        "Issuer declined transaction",
        "Do not honor — bank policy",
        "Transaction declined by issuing bank",
    ],
    "card_expired": [
        "Card has expired",
        "Expired instrument — update required",
    ],
    "authentication_failure": [
        "3DS authentication failed",
        "OTP verification timed out",
        "Authentication rejected by customer",
    ],
    "network_technical": [
        "Gateway timeout",
        "Network connection reset",
        "Payment processor error",
    ],
    "temporary_bank_issue": [
        "Issuing bank temporarily unavailable",
        "Bank network outage",
        "Bank service degraded",
    ],
    "unknown": [
        "Unclassified processor error",
        "Unknown failure",
    ],
}

# probability a given failure category appears (weights)
CAT_WEIGHTS = [
    ("temporary_bank_issue", 0.22),
    ("network_technical", 0.18),
    ("insufficient_funds", 0.20),
    ("bank_decline", 0.15),
    ("authentication_failure", 0.13),
    ("card_expired", 0.07),
    ("unknown", 0.05),
]


def _weighted_category() -> str:
    r = random.random()
    cum = 0.0
    for cat, w in CAT_WEIGHTS:
        cum += w
        if r <= cum:
            return cat
    return "unknown"


def _amount() -> float:
    # Skew toward smaller amounts, with some high-value outliers
    r = random.random()
    if r < 0.5:
        return round(random.uniform(199, 2999), 2)
    if r < 0.8:
        return round(random.uniform(3000, 14999), 2)
    if r < 0.95:
        return round(random.uniform(15000, 49999), 2)
    return round(random.uniform(50000, 150000), 2)


def _phone() -> str:
    return "+91 " + "".join(str(random.randint(0, 9)) for _ in range(10))


def seed_database(db: Session) -> None:
    # Wipe
    db.query(AuditLog).delete()
    db.query(Alert).delete()
    db.query(Campaign).delete()
    db.query(Payment).delete()
    db.query(Customer).delete()
    db.commit()

    now = datetime.utcnow()

    # Customers
    customers = []
    for i in range(120):
        name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        email = f"{name.lower().replace(' ', '.')}@{random.choice(COMPANIES).lower()}.com"
        methods = random.sample(METHODS, k=random.randint(1, 3))
        seg = random.choices(SEGMENTS, weights=[0.2, 0.5, 0.2, 0.1])[0]
        cust = Customer(
            name=name,
            email=email,
            phone=_phone(),
            segment=seg,
            payment_methods=str(methods),
            created_at=now - timedelta(days=random.randint(30, 400)),
        )
        db.add(cust)
        customers.append(cust)
    db.flush()

    # Payments — 600 total
    payments = []
    for i in range(600):
        cust = random.choice(customers)
        amount = _amount()
        method = random.choice(cust.payment_methods.strip("[]'").replace("'", "").split(", ")) if cust.payment_methods else random.choice(METHODS)
        # normalize method parse
        try:
            mlist = [m.strip().strip("'\" ") for m in cust.payment_methods.strip("[]").split(",") if m.strip()]
            method = random.choice(mlist)
        except Exception:
            method = random.choice(METHODS)

        # 18% failure rate
        is_failed = random.random() < 0.18
        days_ago = random.randint(0, 59)
        hours_ago = random.randint(0, 23)
        ts = now - timedelta(days=days_ago, hours=hours_ago)

        if is_failed:
            cat = _weighted_category()
            reason = random.choice(FAILURE_REASONS[cat])
            status = "failed"
            failure_reason = reason
            failure_category = cat
        else:
            status = "succeeded"
            failure_reason = None
            failure_category = None

        pid = f"pay_{i+1:06d}"
        p = Payment(
            id=pid,
            customer_id=cust.id,
            amount=amount,
            currency="INR",
            status=status,
            method=method,
            failure_reason=failure_reason,
            failure_category=failure_category,
            retry_count=0,
            created_at=ts,
        )
        db.add(p)
        payments.append(p)
    db.flush()

    # Some recovered payments (simulate past recoveries) — ~30% of failed become recovered
    failed_only = [p for p in payments if p.status == "failed"]
    recovered_count = int(len(failed_only) * 0.30)
    for p in random.sample(failed_only, recovered_count):
        p.status = "recovered"
        p.resolved_at = p.created_at + timedelta(hours=random.randint(1, 48))
        p.retry_count = random.randint(1, 2)

    db.flush()

    # Score all failed payments and persist analysis
    for p in payments:
        if p.status == "failed":
            analysis = analyze_payment(db, p)
            p.recovery_probability = analysis["recovery_probability"]
            p.risk_level = analysis["risk_level"]
            p.priority = analysis["priority"]
            p.expected_recovery = analysis["expected_recovery"]
            p.recommended_action = analysis["recommended_action"]
            p.action_reason = analysis["action_reason"]
    db.flush()

    # Seed a few campaigns
    db.add(Campaign(name="High-Value Recovery Sprint", type="high_value", status="completed",
                    targeted=24, sent=24, recoveries=15, revenue_recovered=285000, created_at=now - timedelta(days=20)))
    db.add(Campaign(name="Failed Payment Reminder Wave", type="reminder", status="completed",
                    targeted=60, sent=60, recoveries=31, revenue_recovered=142000, created_at=now - timedelta(days=12)))
    db.add(Campaign(name="Smart Retry — Temporary Failures", type="smart_retry", status="active",
                    targeted=38, sent=20, recoveries=11, revenue_recovered=88000, created_at=now - timedelta(days=3)))
    db.add(Campaign(name="Payment Method Recovery", type="method_recovery", status="active",
                    targeted=18, sent=10, recoveries=4, revenue_recovered=36000, created_at=now - timedelta(days=1)))

    # Seed initial alerts from high-value at-risk payments
    high_risk = [p for p in payments if p.status == "failed" and p.amount >= 50000 and p.recovery_probability and p.recovery_probability >= 0.7]
    for p in high_risk[:5]:
        db.add(Alert(
            severity="high",
            type="high_value_at_risk",
            title="High-value payment at risk",
            message=f"₹{int(p.amount):,} payment has {int(p.recovery_probability*100)}% recovery probability.",
            payment_id=p.id,
            amount=p.amount,
        ))
    med = [p for p in payments if p.status == "failed" and p.amount >= 5000 and p.recovery_probability and 0.5 <= p.recovery_probability < 0.7]
    for p in med[:4]:
        db.add(Alert(
            severity="medium",
            type="retry_opportunity",
            title="Retry opportunity",
            message=f"₹{int(p.amount):,} payment can potentially be recovered.",
            payment_id=p.id,
            amount=p.amount,
        ))

    # Seed a couple of audit logs for context
    db.add(AuditLog(
        payment_id=high_risk[0].id if high_risk else None,
        action="AI analysis completed",
        ai_recommendation="Retry payment in 30 minutes",
        reason="Temporary bank issue with high recovery probability",
        result="analysis",
        amount=high_risk[0].amount if high_risk else None,
        timestamp=now - timedelta(hours=2),
    ))

    db.commit()
    print(f"Seeded {len(customers)} customers, {len(payments)} payments "
          f"({len([p for p in payments if p.status=='failed'])} failed, "
          f"{len([p for p in payments if p.status=='recovered'])} recovered).")
