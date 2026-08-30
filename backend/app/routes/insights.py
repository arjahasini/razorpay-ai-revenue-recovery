"""Insights route."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.insight_engine import generate_insights
from app.routes.auth import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/api/insights")
def get_insights(db: Session = Depends(get_db)):
    return {"items": generate_insights(db)}
