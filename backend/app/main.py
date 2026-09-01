"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine, SessionLocal
from app.models import User, Customer
from app.seed.seed_data import seed_database
from app.services.auth_service import hash_password
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


def seed_demo_user(db):
    """Create demo user if no users exist."""
    if db.query(User).count() == 0:
        db.add(
            User(
                name="Demo Merchant",
                email="demo@example.com",
                hashed_password=hash_password("Demo@123"),
            )
        )
        db.commit()

        print("Seeded demo user: demo@example.com / Demo@123")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Initialize database when the FastAPI application starts.
    """

    # Make sure models are registered with SQLAlchemy
    from app.models import User, Customer

    # Create all database tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Create demo login account
        seed_demo_user(db)

        # Create demo customer/payment data
        if db.query(Customer).count() == 0:
            seed_database(db)

    except Exception as e:
        print(f"Database initialization error: {e}")

    finally:
        db.close()

    yield


app = FastAPI(
    title="AI Revenue Recovery Agent",
    version="1.0.0",
    lifespan=lifespan,
)


# -------------------------
# CORS
# -------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------
# Routes
# -------------------------

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(payments.router)
app.include_router(recovery.router)
app.include_router(customers.router)
app.include_router(analytics.router)
app.include_router(insights.router)
app.include_router(audit.router)


# -------------------------
# Root
# -------------------------

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "AI Revenue Recovery Agent",
    }


# -------------------------
# Health Check
# -------------------------

@app.get("/api/health")
def health():
    return {
        "status": "healthy"
    }