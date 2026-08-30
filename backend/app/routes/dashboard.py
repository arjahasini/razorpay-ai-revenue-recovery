"""Dashboard route — aggregated KPIs and chart data."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from collections import defaultdict

from app.database import get_db
from app.models import Payment, Customer, AuditLog
from app.services.recovery_engine import analyze_payment
from app.routes.auth import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


def _inr_short(v: float) -> str:
    if v >= 100000:
        return f"{v/100000:.2f}L"
    return f"{int(v):,}"


@router.get("/api/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    payments = db.query(Payment).all()
    total_volume = sum(p.amount for p in payments)
    succeeded = [p for p in payments if p.status == "succeeded"]
    recovered = [p for p in payments if p.status == "recovered"]
    failed = [p for p in payments if p.status == "failed"]

    recoverable_revenue = sum(p.amount for p in failed)
    revenue_recovered = sum(p.amount for p in recovered)
    recovery_rate = (revenue_recovered / (revenue_recovered + recoverable_revenue)) if (revenue_recovered + recoverable_revenue) > 0 else 0

    # AI predicted recovery = sum of expected_recovery of failed payments
    ai_predicted = 0.0
    for p in failed:
        if p.expected_recovery:
            ai_predicted += p.expected_recovery
        else:
            ai_predicted += p.amount * 0.5

    customers_needing_action = len(set(p.customer_id for p in failed))
    revenue_at_risk = sum(p.amount for p in failed if p.priority in ("P1", "P2"))

    # Charts
    # 1. Revenue recovered over time (last 30 days)
    recovered_over_time = []
    for d in range(30, -1, -1):
        day = datetime.utcnow() - timedelta(days=d)
        day_total = sum(p.amount for p in recovered if p.resolved_at and p.resolved_at.date() == day.date())
        recovered_over_time.append({"date": day.strftime("%b %d"), "recovered": round(day_total, 2)})

    # 2. Failed vs recovered (last 14 days)
    failed_vs_recovered = []
    for d in range(13, -1, -1):
        day = datetime.utcnow() - timedelta(days=d)
        f_count = sum(1 for p in failed if p.created_at.date() == day.date())
        r_count = sum(1 for p in recovered if p.resolved_at and p.resolved_at.date() == day.date())
        failed_vs_recovered.append({"date": day.strftime("%b %d"), "failed": f_count, "recovered": r_count})

    # 3. Failure reason distribution
    cat_counts = defaultdict(int)
    for p in failed:
        cat_counts[p.failure_category or "unknown"] += 1
    failure_distribution = [{"name": k.replace("_", " ").title(), "value": v} for k, v in sorted(cat_counts.items(), key=lambda x: -x[1])]

    # 4. Recovery probability distribution
    buckets = {"0-20%": 0, "20-40%": 0, "40-60%": 0, "60-80%": 0, "80-100%": 0}
    for p in failed:
        prob = p.recovery_probability or 0
        if prob < 0.2:
            buckets["0-20%"] += 1
        elif prob < 0.4:
            buckets["20-40%"] += 1
        elif prob < 0.6:
            buckets["40-60%"] += 1
        elif prob < 0.8:
            buckets["60-80%"] += 1
        else:
            buckets["80-100%"] += 1
    prob_distribution = [{"bucket": k, "count": v} for k, v in buckets.items()]

    # 5. Recovery funnel
    funnel = [
        {"stage": "Failed Payments", "value": len(failed)},
        {"stage": "AI Analyzed", "value": len(failed)},
        {"stage": "Action Recommended", "value": len(failed)},
        {"stage": "Retry Attempted", "value": len(recovered)},
        {"stage": "Recovered", "value": len(recovered)},
    ]

    return {
        "total_volume": round(total_volume, 2),
        "failed_payments": len(failed),
        "recoverable_revenue": round(recoverable_revenue, 2),
        "revenue_recovered": round(revenue_recovered, 2),
        "recovery_rate": round(recovery_rate, 4),
        "ai_predicted_recovery": round(ai_predicted, 2),
        "customers_needing_action": customers_needing_action,
        "revenue_at_risk": round(revenue_at_risk, 2),
        "total_payments": len(payments),
        "succeeded_payments": len(succeeded),
        "recovered_payments": len(recovered),
        "charts": {
            "recovered_over_time": recovered_over_time,
            "failed_vs_recovered": failed_vs_recovered,
            "failure_distribution": failure_distribution,
            "probability_distribution": prob_distribution,
            "funnel": funnel,
        },
    }
