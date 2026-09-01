from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import (
    dashboard,
    payments,
    recovery,
    customers,
    analytics,
    insights,
    audit,
    auth,
)

app = FastAPI(
    title="Razorpay AI Revenue Recovery API",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/api/health")
def health():
    return {"status": "healthy"}

# Routes
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(payments.router)
app.include_router(recovery.router)
app.include_router(customers.router)
app.include_router(analytics.router)
app.include_router(insights.router)
app.include_router(audit.router)