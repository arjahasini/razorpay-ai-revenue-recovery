"""Payments route — list, filter, sort, paginate, detail."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional

from app.database import get_db
from app.models import Payment, Customer
from app.services.recovery_engine import analyze_payment
from app.routes.auth import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/api/payments")
def list_payments(
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    failure_category: Optional[str] = Query(None),
    method: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
):
    q = db.query(Payment).join(Customer)
    if search:
        q = q.filter(or_(
            Payment.id.ilike(f"%{search}%"),
            Customer.name.ilike(f"%{search}%"),
            Customer.email.ilike(f"%{search}%"),
        ))
    if status:
        q = q.filter(Payment.status == status)
    if failure_category:
        q = q.filter(Payment.failure_category == failure_category)
    if method:
        q = q.filter(Payment.method == method)
    if priority:
        q = q.filter(Payment.priority == priority)

    total = q.count()

    sort_col = {
        "created_at": Payment.created_at,
        "amount": Payment.amount,
        "recovery_probability": Payment.recovery_probability,
        "expected_recovery": Payment.expected_recovery,
    }.get(sort, Payment.created_at)
    q = q.order_by(sort_col.desc() if order == "desc" else sort_col.asc())

    items = q.offset((page - 1) * page_size).limit(page_size).all()

    out = []
    for p in items:
        cust = db.query(Customer).filter(Customer.id == p.customer_id).first()
        row = {
            "id": p.id,
            "customer_id": p.customer_id,
            "customer_name": cust.name if cust else "",
            "amount": p.amount,
            "currency": p.currency,
            "status": p.status,
            "method": p.method,
            "failure_reason": p.failure_reason,
            "failure_category": p.failure_category,
            "retry_count": p.retry_count,
            "created_at": p.created_at.isoformat(),
            "resolved_at": p.resolved_at.isoformat() if p.resolved_at else None,
            "recovery_probability": p.recovery_probability,
            "recommended_action": p.recommended_action,
            "action_reason": p.action_reason,
            "priority": p.priority,
            "expected_recovery": p.expected_recovery,
            "risk_level": p.risk_level,
        }
        out.append(row)

    return {"items": out, "total": total, "page": page, "page_size": page_size}


@router.get("/api/payments/{payment_id}")
def get_payment(payment_id: str, db: Session = Depends(get_db)):
    p = db.query(Payment).filter(Payment.id == payment_id).first()
    if not p:
        return {"error": "not found"}
    cust = db.query(Customer).filter(Customer.id == p.customer_id).first()
    analysis = analyze_payment(db, p)
    return {
        "id": p.id,
        "customer_id": p.customer_id,
        "customer_name": cust.name if cust else "",
        "customer_email": cust.email if cust else "",
        "customer_segment": cust.segment if cust else "",
        "amount": p.amount,
        "currency": p.currency,
        "status": p.status,
        "method": p.method,
        "failure_reason": p.failure_reason,
        "failure_category": p.failure_category,
        "retry_count": p.retry_count,
        "created_at": p.created_at.isoformat(),
        "resolved_at": p.resolved_at.isoformat() if p.resolved_at else None,
        "recovery_probability": analysis["recovery_probability"],
        "recommended_action": analysis["recommended_action"],
        "action_reason": analysis["action_reason"],
        "priority": analysis["priority"],
        "expected_recovery": analysis["expected_recovery"],
        "risk_level": analysis["risk_level"],
        "positive_factors": analysis["positive_factors"],
        "negative_factors": analysis["negative_factors"],
        "failure_explanation": analysis["failure_explanation"],
    }
