from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Publication, Faculty
from app.routers.auth import get_current_faculty
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class PublicationCreate(BaseModel):
    title:         str
    journal_name:  str
    doi:           Optional[str] = None
    indexing:      str = "None"
    quartile:      str = "N/A"
    impact_factor: float = 0
    year:          int
    citations_count: int = 0

@router.get("/")
def get_publications(db: Session = Depends(get_db),
                     current=Depends(get_current_faculty)):
    pubs = db.query(Publication).filter(
        Publication.faculty_id == current["faculty_id"]
    ).order_by(Publication.year.desc()).all()
    return pubs

@router.post("/")
def add_publication(pub: PublicationCreate, db: Session = Depends(get_db),
                    current=Depends(get_current_faculty)):
    new_pub = Publication(
        faculty_id    = current["faculty_id"],
        title         = pub.title,
        journal_name  = pub.journal_name,
        doi           = pub.doi,
        indexing      = pub.indexing,
        quartile      = pub.quartile,
        impact_factor = pub.impact_factor,
        year          = pub.year,
        citations_count = pub.citations_count,
    )
    db.add(new_pub)
    # Update faculty total_publications count
    faculty = db.query(Faculty).filter(
        Faculty.faculty_id == current["faculty_id"]
    ).first()
    if faculty:
        faculty.total_publications = (faculty.total_publications or 0) + 1
    db.commit()
    db.refresh(new_pub)
    return {"message": "Publication added successfully", "pub_id": new_pub.pub_id}

@router.delete("/{pub_id}")
def delete_publication(pub_id: int, db: Session = Depends(get_db),
                       current=Depends(get_current_faculty)):
    pub = db.query(Publication).filter(
        Publication.pub_id == pub_id,
        Publication.faculty_id == current["faculty_id"]
    ).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")
    db.delete(pub)
    db.commit()
    return {"message": "Deleted successfully"}