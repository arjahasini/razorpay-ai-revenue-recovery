"""Payment simulator — safe retry simulation (no real financial transactions)."""
import random
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Payment, AuditLog, Alert
from app.services.recovery_engine import analyze_payment


def simulate_retry(db: Session, payment: Payment) -> dict:
    """Simulate a retry attempt. Success is probabilistic, weighted by recovery_probability."""
    analysis = analyze_payment(db, payment)
    prob = analysis["recovery_probability"]

    # Weighted coin flip using the model's probability
    success = random.random() < prob
    payment.retry_count = (payment.retry_count or 0) + 1

    if success:
        payment.status = "recovered"
        payment.resolved_at = datetime.utcnow()
        payment.recovery_probability = prob
        result = "recovered"
        alert_sev = "low"
        alert_type = "recovery_completed"
        alert_title = "Recovery completed"
        alert_msg = f"₹{int(payment.amount):,} successfully recovered."
    else:
        payment.status = "failed"
        payment.recovery_probability = prob
        result = "still_failed"
        alert_sev = "medium"
        alert_type = "retry_failed"
        alert_title = "Retry failed"
        alert_msg = f"Retry attempt on ₹{int(payment.amount):,} payment did not succeed."

    db.add(AuditLog(
        payment_id=payment.id,
        action="Retry payment",
        ai_recommendation=analysis["recommended_action"],
        reason=analysis["action_reason"],
        result=result,
        amount=payment.amount,
    ))
    db.add(Alert(
        severity=alert_sev,
        type=alert_type,
        title=alert_title,
        message=alert_msg,
        payment_id=payment.id,
        amount=payment.amount,
    ))
    db.commit()

    return {
        "payment_id": payment.id,
        "success": success,
        "new_status": payment.status,
        "amount": payment.amount,
        "ai_recommendation": analysis["recommended_action"],
        "reason": analysis["action_reason"],
        "simulated": True,
    }


def send_reminder(db: Session, payment: Payment) -> dict:
    """Log a reminder send (no real message dispatched in demo)."""
    analysis = analyze_payment(db, payment)
    db.add(AuditLog(
        payment_id=payment.id,
        action="Send payment reminder",
        ai_recommendation=analysis["recommended_action"],
        reason=analysis["action_reason"],
        result="reminder_sent",
        amount=payment.amount,
    ))
    db.commit()
    return {
        "payment_id": payment.id,
        "success": True,
        "new_status": payment.status,
        "amount": payment.amount,
        "ai_recommendation": analysis["recommended_action"],
        "reason": analysis["action_reason"],
        "simulated": True,
    }
