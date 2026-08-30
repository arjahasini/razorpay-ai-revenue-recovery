"""Customers route."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from collections import defaultdict

from app.database import get_db
from app.models import Customer, Payment
from app.routes.auth import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/api/customers")
def list_customers(
    db: Session = Depends(get_db),
    search: str | None = None,
    page: int = 1,
    page_size: int = 12,
):
    q = db.query(Customer)
    if search:
        q = q.filter(Customer.name.ilike(f"%{search}%"))
    total = q.count()
    customers = q.offset((page - 1) * page_size).limit(page_size).all()

    out = []
    for c in customers:
        pays = db.query(Payment).filter(Payment.customer_id == c.id).all()
        succ = sum(1 for p in pays if p.status in ("succeeded", "recovered"))
        failed = sum(1 for p in pays if p.status == "failed")
        total_rev = sum(p.amount for p in pays if p.status in ("succeeded", "recovered"))
        failed_rev = sum(p.amount for p in pays if p.status == "failed")
        recovered_rev = sum(p.amount for p in pays if p.status == "recovered")
        recovery_score = (succ / len(pays)) if pays else 0
        out.append({
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
            "segment": c.segment,
            "payment_methods": eval(c.payment_methods) if c.payment_methods else [],
            "created_at": c.created_at.isoformat(),
            "total_payments": len(pays),
            "successful_payments": succ,
            "failed_payments": failed,
            "total_revenue": round(total_rev, 2),
            "failed_revenue": round(failed_rev, 2),
            "recovered_revenue": round(recovered_rev, 2),
            "recovery_score": round(recovery_score, 4),
        })
    return {"items": out, "total": total, "page": page, "page_size": page_size}


@router.get("/api/customers/{customer_id}")
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    pays = db.query(Payment).filter(Payment.customer_id == c.id).order_by(Payment.created_at.desc()).all()
    succ = sum(1 for p in pays if p.status in ("succeeded", "recovered"))
    failed = sum(1 for p in pays if p.status == "failed")
    total_rev = sum(p.amount for p in pays if p.status in ("succeeded", "recovered"))
    failed_rev = sum(p.amount for p in pays if p.status == "failed")
    recovered_rev = sum(p.amount for p in pays if p.status == "recovered")
    recovery_score = (succ / len(pays)) if pays else 0

    recent_activity = []
    for p in pays[:8]:
        verb = "succeeded" if p.status == "succeeded" else ("recovered" if p.status == "recovered" else "failed")
        recent_activity.append(f"₹{int(p.amount):,} payment {verb} on {p.created_at.strftime('%b %d, %H:%M')}")

    return {
        "id": c.id,
        "name": c.name,
        "email": c.email,
        "phone": c.phone,
        "segment": c.segment,
        "payment_methods": eval(c.payment_methods) if c.payment_methods else [],
        "created_at": c.created_at.isoformat(),
        "total_payments": len(pays),
        "successful_payments": succ,
        "failed_payments": failed,
        "total_revenue": round(total_rev, 2),
        "failed_revenue": round(failed_rev, 2),
        "recovered_revenue": round(recovered_rev, 2),
        "recovery_score": round(recovery_score, 4),
        "recent_activity": recent_activity,
        "recent_payments": [
            {
                "id": p.id,
                "amount": p.amount,
                "status": p.status,
                "method": p.method,
                "failure_category": p.failure_category,
                "created_at": p.created_at.isoformat(),
                "recovery_probability": p.recovery_probability,
                "priority": p.priority,
            }
            for p in pays[:10]
        ],
    }
