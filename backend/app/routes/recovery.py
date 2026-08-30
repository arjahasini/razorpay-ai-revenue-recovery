"""Recovery route — queue, retry simulation, reminders."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Payment, Customer, AuditLog
from app.services.ai_engine import rank_queue
from app.services.recovery_engine import analyze_payment
from app.services.payment_simulator import simulate_retry, send_reminder
from app.routes.auth import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/api/recovery/queue")
def get_queue(db: Session = Depends(get_db)):
    items = rank_queue(db)
    out = []
    # summary
    total_expected = 0.0
    for it in items:
        p = it["payment"]
        a = it["analysis"]
        cust = db.query(Customer).filter(Customer.id == p.customer_id).first()
        total_expected += a["expected_recovery"]
        out.append({
            "payment_id": p.id,
            "customer_id": p.customer_id,
            "customer_name": cust.name if cust else "",
            "amount": p.amount,
            "recovery_probability": a["recovery_probability"],
            "expected_recovery": a["expected_recovery"],
            "failure_reason": p.failure_reason,
            "failure_category": p.failure_category,
            "recommended_action": a["recommended_action"],
            "action_reason": a["action_reason"],
            "priority": a["priority"],
            "risk_level": a["risk_level"],
        })
    return {
        "items": out,
        "total": len(out),
        "total_expected_recovery": round(total_expected, 2),
        "summary": _queue_summary(out),
    }


def _queue_summary(items):
    """Headline: 'Recover ₹X from N payments first'."""
    p1p2 = [i for i in items if i["priority"] in ("P1", "P2")]
    total = sum(i["expected_recovery"] for i in p1p2)
    return {
        "headline_amount": round(total, 2),
        "headline_count": len(p1p2),
    }


@router.get("/api/recovery/{payment_id}")
def get_recovery(payment_id: str, db: Session = Depends(get_db)):
    p = db.query(Payment).filter(Payment.id == payment_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    return analyze_payment(db, p)


@router.post("/api/recovery/{payment_id}/retry")
def retry_payment(payment_id: str, db: Session = Depends(get_db)):
    p = db.query(Payment).filter(Payment.id == payment_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    return simulate_retry(db, p)


@router.post("/api/recovery/{payment_id}/remind")
def remind_payment(payment_id: str, db: Session = Depends(get_db)):
    p = db.query(Payment).filter(Payment.id == payment_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    return send_reminder(db, p)
