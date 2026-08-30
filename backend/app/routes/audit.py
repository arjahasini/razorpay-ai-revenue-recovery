"""Audit log route."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AuditLog
from app.routes.auth import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/api/audit-logs")
def list_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
    return {
        "items": [
            {
                "id": l.id,
                "timestamp": l.timestamp.isoformat(),
                "payment_id": l.payment_id,
                "action": l.action,
                "ai_recommendation": l.ai_recommendation,
                "reason": l.reason,
                "result": l.result,
                "amount": l.amount,
            }
            for l in logs
        ]
    }
