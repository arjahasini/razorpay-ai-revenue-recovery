"""AI strategy engine — wraps the recovery engine for queue ranking and strategy selection."""
from sqlalchemy.orm import Session
from app.models import Payment
from app.services.recovery_engine import analyze_payment


def rank_queue(db: Session) -> list:
    """Return failed payments ranked by expected recovery value (priority-weighted)."""
    failed = db.query(Payment).filter(Payment.status == "failed").all()
    items = []
    for p in failed:
        analysis = analyze_payment(db, p)
        items.append({
            "payment": p,
            "analysis": analysis,
        })
    # Sort by priority then expected recovery desc
    pri_order = {"P1": 0, "P2": 1, "P3": 2, "P4": 3}
    items.sort(key=lambda x: (pri_order.get(x["analysis"]["priority"], 9), -x["analysis"]["expected_recovery"]))
    return items
