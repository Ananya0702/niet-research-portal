from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import Session
from app.database import get_db, Base
from app.dependencies import get_current_faculty
from pydantic import BaseModel
from typing import Optional
from datetime import date

router = APIRouter()

# ── Model (in case not already in models.py) ──
class Collaboration(Base):
    __tablename__ = "collaborations"
    collab_id      = Column(Integer, primary_key=True)
    dept_id        = Column(Integer, nullable=True)
    faculty_id     = Column(Integer, ForeignKey("faculty.faculty_id"), nullable=True)
    institute_name = Column(String(200))
    collab_type    = Column(String(50))
    start_date     = Column(Date, nullable=True)
    status         = Column(String(20), default="Active")

class CollabCreate(BaseModel):
    institute_name: str
    collab_type:    str = "Research MoU"
    start_date:     Optional[date] = None
    status:         str = "Active"

@router.get("/")
def get_collaborations(db: Session = Depends(get_db),
                       current=Depends(get_current_faculty)):
    collabs = db.query(Collaboration).filter(
        Collaboration.faculty_id == current["faculty_id"]
    ).all()
    return [
        {
            "collab_id":      c.collab_id,
            "institute_name": c.institute_name,
            "collab_type":    c.collab_type,
            "start_date":     str(c.start_date) if c.start_date else None,
            "status":         c.status,
        }
        for c in collabs
    ]

@router.post("/")
def add_collaboration(c: CollabCreate, db: Session = Depends(get_db),
                      current=Depends(get_current_faculty)):
    collab = Collaboration(
        faculty_id     = current["faculty_id"],
        dept_id        = current.get("dept_id"),
        institute_name = c.institute_name,
        collab_type    = c.collab_type,
        start_date     = c.start_date,
        status         = c.status,
    )
    db.add(collab)
    db.commit()
    db.refresh(collab)
    return {"message": "Collaboration added", "collab_id": collab.collab_id}

@router.delete("/{collab_id}")
def delete_collaboration(collab_id: int, db: Session = Depends(get_db),
                         current=Depends(get_current_faculty)):
    c = db.query(Collaboration).filter(
        Collaboration.collab_id == collab_id,
        Collaboration.faculty_id == current["faculty_id"]
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(c)
    db.commit()
    return {"message": "Deleted"}