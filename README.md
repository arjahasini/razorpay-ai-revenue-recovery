# Razorpay AI Revenue Recovery Agent

> Turn failed payments into recovered revenue.

An intelligent AI-powered payment recovery system that detects failed payments, understands why they failed, predicts the probability of successful recovery, selects the best recovery strategy, and automatically guides merchants toward recovering lost revenue.

Built for the **Razorpay AI Buildathon** — Track 3: AI Revenue Recovery.

---

## The Problem

Merchants lose revenue when customer payments fail due to:
- Insufficient balance
- Bank declines
- Expired cards
- Authentication failures
- Network / technical issues
- Temporary bank outages
- Repeated failures and customer abandonment

Most merchants simply see "failed" and move on. **They leave recoverable revenue on the table.**

## The Solution

The AI Revenue Recovery Agent doesn't just show failed transactions — it intelligently determines:

1. **Why** the payment failed (failure classification + explanation)
2. **Whether** it's recoverable
3. **How likely** recovery is (ML probability model)
4. **When** to retry
5. **Which action** to take (strategy engine)
6. **Which customers** to prioritize (recovery queue)
7. **How much revenue** can be recovered

### The Recovery Story

```
FAILED PAYMENT
    ↓
AI ANALYZES FAILURE
    ↓
AI PREDICTS RECOVERY PROBABILITY
    ↓
AI ESTIMATES EXPECTED RECOVERY
    ↓
AI CHOOSES BEST ACTION
    ↓
MERCHANT TAKES ACTION
    ↓
PAYMENT RECOVERED
    ↓
REVENUE RECOVERED
```

## Why AI?

Every failed payment has a different recovery outlook. A temporary bank outage is highly recoverable; an expired card is not. A customer with 8 successful prior payments is more likely to recover than a first-time buyer. The AI model weighs these factors to produce a **transparent, explainable recovery probability** — not a black-box guess.

The model is a **logistic regression** with hand-tuned weights, so every prediction can be explained:
- "Recovery probability 87% because: customer has 8 previous successes, failure is temporary, no retries attempted yet."

This is real ML (logistic regression with sigmoid activation), not a random number generator. Every recommendation comes with a human-readable reason.

## Architecture

```
Frontend (React + Vite + Tailwind)
        ↓ REST API
Backend (FastAPI + SQLAlchemy)
        ↓
AI/ML Recovery Engine (scikit-learn-style logistic model)
        ↓
Database (SQLite)
```

```
frontend/  (this repo root — src/)
    components/    — Sidebar, Topbar, StatCard, PaymentDrawer, States
    pages/         — Dashboard, Payments, Recovery, Customers, Campaigns, Analytics, Insights, Audit, Settings
    services/      — API client
    hooks/         — useApi hook
    utils/         — formatting helpers
    types.ts       — TypeScript interfaces

backend/
    app/
        main.py              — FastAPI app + CORS + startup seeding
        database.py          — SQLAlchemy engine + session
        models.py            — ORM models (Customer, Payment, AuditLog, Campaign, Alert)
        schemas.py           — Pydantic schemas
        routes/              — dashboard, payments, recovery, customers, analytics, insights, audit
        services/             — recovery_engine, ai_engine, payment_simulator, insight_engine
        ml/                  — features, model (logistic regression)
        seed/                — seed_data (120 customers, 600 payments)
    requirements.txt
```

## Features

| Feature | Description |
|---------|-------------|
| **AI Dashboard** | KPIs, recovery charts, funnel, hero section with recoverable revenue |
| **Payments** | Full table with search, filters, sort, pagination, AI analysis drawer |
| **AI Failure Analysis** | Classifies failures into 7 categories with explanations |
| **Recovery Probability** | Logistic regression model — 0-100% with explainable factors |
| **Strategy Engine** | Recommends best action (retry, remind, switch method, escalate) |
| **Smart Retry** | Safe simulation — no real charges, probabilistic outcome |
| **Recovery Queue** | AI-prioritized queue: "Recover ₹X from N payments first" |
| **Expected Recovery Value** | Amount × Probability — used for ranking |
| **Customer Profiles** | Payment history, recovery score, recent activity |
| **Campaigns** | Create and track simulated recovery campaigns |
| **AI Insights** | Auto-generated insights from live data |
| **Revenue Forecast** | 30-day projection with best-case / projected / current |
| **Alerts** | High-value at risk, retry opportunities, recovery completed |
| **Audit Logs** | Every AI action logged for transparency |
| **Demo Mode** | One-click toggle for smooth live demos |

## AI Methodology

### Recovery Probability Model

A **logistic regression** with 9 weighted features:

| Feature | Weight | Effect |
|---------|--------|--------|
| Failure category base rate | +3.2 | Category-specific prior (e.g. temporary = 0.82, expired = 0.18) |
| Customer success ratio | +1.8 | Prior successes / total payments |
| Retry count | -1.4 | More retries = lower probability |
| Inverse retry count | +0.6 | Fresh opportunity bonus |
| Hours since failure | +0.3 | Timing factor |
| Customer activity score | +1.1 | Engagement level |
| Historical recovery rate | +1.5 | Base rate for similar failures |
| Payment method ease | +0.7 | UPI > card > netbanking |
| Small amount bonus | +0.9 | Smaller amounts recover more |

**Probability = sigmoid(w · x + b)**, clamped to [2%, 98%].

### Explainability

Every prediction returns:
- **Positive factors** (✓): things increasing recovery likelihood
- **Negative factors** (⚠): things decreasing it
- **Failure explanation**: why the payment failed in plain language
- **Recommended action + reason**: what to do and why

### Strategy Engine

Rule-based action selection driven by failure category + probability:
- **Card expired** → ask customer to update method
- **Authentication failure** → request re-auth / send link
- **Temporary bank issue** → retry in 30 minutes
- **Insufficient funds** → send reminder (end of day)
- **Bank decline** → retry or escalate based on probability

## Tech Stack

**Backend:** Python, FastAPI, Pydantic, SQLAlchemy, SQLite
**AI/ML:** scikit-learn-style logistic regression, Pandas, NumPy
**Frontend:** React, Vite, TypeScript, Tailwind CSS, Recharts, Lucide icons

## Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start the server (auto-seeds the database on first run)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The database auto-creates and seeds 120 customers + 600 payments (75 failed, 32 recovered) on first startup.

### Frontend

```bash
# From the project root
npm install
npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:8000`.

Open `http://localhost:5173` in your browser.

## API Documentation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/dashboard` | Aggregated KPIs + chart data |
| GET | `/api/payments` | Paginated payments (search, filter, sort) |
| GET | `/api/payments/{id}` | Payment detail with AI analysis |
| GET | `/api/customers` | Paginated customers |
| GET | `/api/customers/{id}` | Customer profile + recent payments |
| GET | `/api/recovery/queue` | AI-prioritized recovery queue |
| GET | `/api/recovery/{id}` | Recovery analysis for a payment |
| POST | `/api/recovery/{id}/retry` | Simulate a retry attempt |
| POST | `/api/recovery/{id}/remind` | Send a payment reminder |
| GET | `/api/campaigns` | List campaigns |
| POST | `/api/campaigns` | Create a campaign |
| GET | `/api/analytics` | Revenue forecast + projection series |
| GET | `/api/insights` | AI-generated insights |
| GET | `/api/audit-logs` | Action audit trail |
| GET | `/api/alerts` | Recent alerts |

## Demo Flow

1. **Open the Dashboard** — see recoverable revenue, recovery rate, and charts
2. **Go to AI Recovery** — see the prioritized queue: "Recover ₹X from N payments first"
3. **Click "View Details"** on a P1 payment — see AI failure analysis, probability, and recommendation
4. **Click "Retry Payment"** — watch the safe simulation run (success is probabilistic)
5. **Return to Dashboard** — recovered revenue has updated
6. **Check Audit Logs** — the retry action is logged with AI recommendation and result
7. **Toggle Demo Mode** in the top bar — confirms all retries are simulated

## Future Improvements

- Real Razorpay payment integration (replace simulation)
- Time-series retry optimization (best retry window per customer)
- LLM-powered natural language insight generation
- Multi-merchant tenant support
- Webhook-driven real-time failure detection
- A/B testing of recovery strategies
