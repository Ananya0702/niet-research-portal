from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Achievement
from app.routers.auth import get_current_faculty
from pydantic import BaseModel
from typing import Optional
from app.routers.activity import log_activity

router = APIRouter()

class AchievementCreate(BaseModel):
    title:    str
    category: str = "Award"
    issuer:   str = ""
    year:     int
    amount:   Optional[float] = None

@router.get("/")
def get_achievements(db: Session = Depends(get_db),
                     current=Depends(get_current_faculty)):
    return db.query(Achievement).filter(
        Achievement.faculty_id == current["faculty_id"]
    ).all()

@router.post("/")
def add_achievement(a: AchievementCreate, db: Session = Depends(get_db),
                    current=Depends(get_current_faculty)):
    ach = Achievement(
        faculty_id = current["faculty_id"],
        title      = a.title,
        category   = a.category,
        issuer     = a.issuer,
        year       = a.year,
        amount     = a.amount,
    )
    db.add(ach)
    db.commit()
    db.refresh(ach)
    log_activity(db, current["faculty_id"], "achievement_added",
             f"Added achievement: {a.title[:60]}")
    return {"message": "Achievement added", "achievement_id": ach.achievement_id}

@router.delete("/{achievement_id}")
def delete_achievement(achievement_id: int, db: Session = Depends(get_db),
                       current=Depends(get_current_faculty)):
    a = db.query(Achievement).filter(
        Achievement.achievement_id == achievement_id,
        Achievement.faculty_id == current["faculty_id"]
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(a)
    db.commit()
    log_activity(db, current["faculty_id"], "achievement_deleted",
             f"Deleted achievement: {a.title[:60]}")
    return {"message": "Deleted"}