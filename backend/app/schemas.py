"""Pydantic response schemas."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class CustomerOut(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    segment: str
    payment_methods: List[str]
    created_at: datetime
    # computed
    total_payments: int = 0
    successful_payments: int = 0
    failed_payments: int = 0
    total_revenue: float = 0.0
    failed_revenue: float = 0.0
    recovered_revenue: float = 0.0
    recovery_score: float = 0.0
    recent_activity: List[str] = []

    class Config:
        from_attributes = True


class PaymentOut(BaseModel):
    id: str
    customer_id: int
    customer_name: str = ""
    amount: float
    currency: str
    status: str
    method: str
    failure_reason: Optional[str] = None
    failure_category: Optional[str] = None
    retry_count: int = 0
    created_at: datetime
    resolved_at: Optional[datetime] = None
    recovery_probability: Optional[float] = None
    recommended_action: Optional[str] = None
    action_reason: Optional[str] = None
    priority: Optional[str] = None
    expected_recovery: Optional[float] = None
    risk_level: Optional[str] = None
    # analysis extras
    positive_factors: List[str] = []
    negative_factors: List[str] = []
    failure_explanation: Optional[str] = None

    class Config:
        from_attributes = True


class AuditLogOut(BaseModel):
    id: int
    timestamp: datetime
    payment_id: Optional[str]
    action: str
    ai_recommendation: Optional[str]
    reason: Optional[str]
    result: Optional[str]
    amount: Optional[float]

    class Config:
        from_attributes = True


class CampaignOut(BaseModel):
    id: int
    name: str
    type: str
    status: str
    targeted: int
    sent: int
    recoveries: int
    revenue_recovered: float
    created_at: datetime
    conversion_rate: float = 0.0

    class Config:
        from_attributes = True


class AlertOut(BaseModel):
    id: int
    timestamp: datetime
    severity: str
    type: str
    title: str
    message: str
    payment_id: Optional[str]
    amount: Optional[float]
    read: bool

    class Config:
        from_attributes = True


class DashboardOut(BaseModel):
    total_volume: float
    failed_payments: int
    recoverable_revenue: float
    revenue_recovered: float
    recovery_rate: float
    ai_predicted_recovery: float
    customers_needing_action: int
    revenue_at_risk: float
    total_payments: int
    succeeded_payments: int
    recovered_payments: int
    charts: dict


class InsightOut(BaseModel):
    id: str
    title: str
    detail: str
    severity: str
    metric: Optional[str] = None


class RetryResult(BaseModel):
    payment_id: str
    success: bool
    new_status: str
    amount: float
    ai_recommendation: str
    reason: str
    simulated: bool = True


class QueueItem(BaseModel):
    payment_id: str
    customer_id: int
    customer_name: str
    amount: float
    recovery_probability: float
    expected_recovery: float
    failure_reason: Optional[str]
    failure_category: Optional[str]
    recommended_action: Optional[str]
    action_reason: Optional[str]
    priority: str
    risk_level: Optional[str]


class ForecastOut(BaseModel):
    revenue_at_risk: float
    expected_recoverable: float
    best_case: float
    current_recovery: float
    projected_recovery: float
    series: List[dict]
