from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.database import get_db, Base
from app.dependencies import get_current_faculty
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class Announcement(Base):
    __tablename__ = "announcements"
    announcement_id = Column(Integer, primary_key=True)
    created_by      = Column(Integer, ForeignKey("faculty.faculty_id"))
    title           = Column(String(300))
    body            = Column(String(2000))
    target_role     = Column(String(20), default="all")
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, server_default=func.now())

class AnnouncementCreate(BaseModel):
    title:       str
    body:        str
    target_role: str = "all"

@router.get("/")
def get_announcements(db: Session = Depends(get_db),
                      current=Depends(get_current_faculty)):
    role = current["role"]
    items = db.query(Announcement).filter(
        Announcement.is_active == True
    ).order_by(Announcement.created_at.desc()).all()

    return [
        {
            "announcement_id": a.announcement_id,
            "title":           a.title,
            "body":            a.body,
            "target_role":     a.target_role,
            "created_at":      a.created_at.isoformat() if a.created_at else None,
        }
        for a in items
        if a.target_role == "all" or a.target_role == role
    ]

@router.post("/")
def post_announcement(a: AnnouncementCreate, db: Session = Depends(get_db),
                      current=Depends(get_current_faculty)):
    if current["role"] != "dean_rd":
        raise HTTPException(status_code=403, detail="Only Dean can post announcements")
    item = Announcement(
        created_by  = current["faculty_id"],
        title       = a.title,
        body        = a.body,
        target_role = a.target_role,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"message": "Announcement posted", "announcement_id": item.announcement_id}

@router.delete("/{announcement_id}")
def delete_announcement(announcement_id: int, db: Session = Depends(get_db),
                        current=Depends(get_current_faculty)):
    if current["role"] != "dean_rd":
        raise HTTPException(status_code=403, detail="Only Dean can delete announcements")
    a = db.query(Announcement).filter(
        Announcement.announcement_id == announcement_id
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(a)
    db.commit()
    return {"message": "Deleted"}