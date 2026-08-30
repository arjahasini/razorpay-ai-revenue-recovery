"""Analytics route — forecast, campaigns, alerts."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.database import get_db
from app.models import Payment, Campaign, Alert
from app.services.recovery_engine import analyze_payment
from app.routes.auth import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/api/analytics")
def get_analytics(db: Session = Depends(get_db)):
    payments = db.query(Payment).all()
    failed = [p for p in payments if p.status == "failed"]
    recovered = [p for p in payments if p.status == "recovered"]

    revenue_at_risk = sum(p.amount for p in failed)
    expected_recoverable = sum((p.expected_recovery or p.amount * 0.5) for p in failed)
    current_recovery = sum(p.amount for p in recovered)
    best_case = revenue_at_risk + current_recovery
    projected_recovery = current_recovery + expected_recoverable * 0.7

    # 30-day projected series
    series = []
    for d in range(30):
        day = datetime.utcnow() + timedelta(days=d)
        # smooth ramp toward projected
        frac = (d + 1) / 30
        val = current_recovery + (projected_recovery - current_recovery) * frac
        series.append({"date": day.strftime("%b %d"), "projected": round(val, 2), "current": round(current_recovery, 2)})

    return {
        "revenue_at_risk": round(revenue_at_risk, 2),
        "expected_recoverable": round(expected_recoverable, 2),
        "best_case": round(best_case, 2),
        "current_recovery": round(current_recovery, 2),
        "projected_recovery": round(projected_recovery, 2),
        "series": series,
    }


@router.get("/api/campaigns")
def list_campaigns(db: Session = Depends(get_db)):
    camps = db.query(Campaign).order_by(Campaign.created_at.desc()).all()
    out = []
    for c in camps:
        conv = (c.recoveries / c.sent * 100) if c.sent else 0
        out.append({
            "id": c.id,
            "name": c.name,
            "type": c.type,
            "status": c.status,
            "targeted": c.targeted,
            "sent": c.sent,
            "recoveries": c.recoveries,
            "revenue_recovered": c.revenue_recovered,
            "created_at": c.created_at.isoformat(),
            "conversion_rate": round(conv, 2),
        })
    return {"items": out}


@router.post("/api/campaigns")
def create_campaign(body: dict, db: Session = Depends(get_db)):
    name = body.get("name", "Untitled Campaign")
    ctype = body.get("type", "reminder")
    # Target failed payments matching the campaign type
    failed = db.query(Payment).filter(Payment.status == "failed").all()
    if ctype == "high_value":
        target = [p for p in failed if p.amount >= 25000]
    elif ctype == "method_recovery":
        target = [p for p in failed if p.failure_category in ("card_expired", "authentication_failure")]
    elif ctype == "smart_retry":
        target = [p for p in failed if p.failure_category in ("temporary_bank_issue", "network_technical")]
    else:
        target = failed[:40]

    sent = min(len(target), 40)
    # simulate some recoveries
    import random
    random.seed()
    recoveries = sum(1 for p in target[:sent] if random.random() < (p.recovery_probability or 0.5))
    revenue = sum(p.amount for p in target[:sent] if random.random() < (p.recovery_probability or 0.5))

    camp = Campaign(
        name=name, type=ctype, status="completed",
        targeted=len(target), sent=sent, recoveries=recoveries,
        revenue_recovered=round(revenue, 2),
    )
    db.add(camp)
    db.commit()
    return {
        "id": camp.id,
        "name": camp.name,
        "type": camp.type,
        "status": camp.status,
        "targeted": camp.targeted,
        "sent": camp.sent,
        "recoveries": camp.recoveries,
        "revenue_recovered": camp.revenue_recovered,
        "conversion_rate": round((recoveries / sent * 100) if sent else 0, 2),
    }


@router.get("/api/alerts")
def list_alerts(db: Session = Depends(get_db)):
    alerts = db.query(Alert).order_by(Alert.timestamp.desc()).limit(50).all()
    return {
        "items": [
            {
                "id": a.id,
                "timestamp": a.timestamp.isoformat(),
                "severity": a.severity,
                "type": a.type,
                "title": a.title,
                "message": a.message,
                "payment_id": a.payment_id,
                "amount": a.amount,
                "read": a.read,
            }
            for a in alerts
        ]
    }


@router.post("/api/alerts/{alert_id}/read")
def mark_alert_read(alert_id: int, db: Session = Depends(get_db)):
    a = db.query(Alert).filter(Alert.id == alert_id).first()
    if a:
        a.read = True
        db.commit()
    return {"ok": True}
