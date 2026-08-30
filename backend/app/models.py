"""SQLAlchemy ORM models."""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, Float, String, DateTime, Boolean, ForeignKey, Text,
)
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    segment = Column(String, nullable=False)  # premium / regular / new / at-risk
    payment_methods = Column(Text, nullable=False)  # JSON array of method labels
    created_at = Column(DateTime, default=datetime.utcnow)

    payments = relationship("Payment", back_populates="customer", cascade="all, delete-orphan")


class Payment(Base):
    __tablename__ = "payments"
    id = Column(String, primary_key=True)  # pay_xxxxx
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    status = Column(String, nullable=False)  # succeeded / failed / recovered / pending
    method = Column(String, nullable=False)  # card / upi / netbanking / wallet
    failure_reason = Column(String, nullable=True)
    failure_category = Column(String, nullable=True)
    retry_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    recovery_probability = Column(Float, nullable=True)  # 0-1
    recommended_action = Column(String, nullable=True)
    action_reason = Column(String, nullable=True)
    priority = Column(String, nullable=True)  # P1 / P2 / P3 / P4
    expected_recovery = Column(Float, nullable=True)
    risk_level = Column(String, nullable=True)  # HIGH / MEDIUM / LOW

    customer = relationship("Customer", back_populates="payments")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    payment_id = Column(String, nullable=True)
    action = Column(String, nullable=False)
    ai_recommendation = Column(String, nullable=True)
    reason = Column(String, nullable=True)
    result = Column(String, nullable=True)
    amount = Column(Float, nullable=True)


class Campaign(Base):
    __tablename__ = "campaigns"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # reminder / smart_retry / method_recovery / high_value
    status = Column(String, default="active")  # active / completed
    targeted = Column(Integer, default=0)
    sent = Column(Integer, default=0)
    recoveries = Column(Integer, default=0)
    revenue_recovered = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)


class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    severity = Column(String, nullable=False)  # high / medium / low
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    payment_id = Column(String, nullable=True)
    amount = Column(Float, nullable=True)
    read = Column(Boolean, default=False)
