from fastapi import APIRouter, Depends
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.database import get_db, Base
from app.dependencies import get_current_faculty

router = APIRouter()

class ActivityLog(Base):
    __tablename__ = "activity_log"
    log_id      = Column(Integer, primary_key=True)
    faculty_id  = Column(Integer, ForeignKey("faculty.faculty_id"))
    action      = Column(String(100))
    description = Column(String(500))
    created_at  = Column(DateTime, server_default=func.now())

def log_activity(db: Session, faculty_id: int, action: str, description: str):
    """Call this from other routers to log an action."""
    entry = ActivityLog(
        faculty_id  = faculty_id,
        action      = action,
        description = description,
    )
    db.add(entry)
    db.commit()

@router.get("/")
def get_activity_log(db: Session = Depends(get_db),
                     current=Depends(get_current_faculty)):
    logs = db.query(ActivityLog).filter(
        ActivityLog.faculty_id == current["faculty_id"]
    ).order_by(ActivityLog.created_at.desc()).limit(50).all()

    return [
        {
            "log_id":      l.log_id,
            "action":      l.action,
            "description": l.description,
            "created_at":  l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]