from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_faculty
from app.models import Patent, Faculty
from pydantic import BaseModel
from typing import Optional
from datetime import date

router = APIRouter()


class PatentCreate(BaseModel):
    title: str
    department: Optional[str] = None
    school: Optional[str] = None
    ipr_type: str = "Patent"
    title_type: str = "National"

    application_number: Optional[str] = None
    publication_number: Optional[str] = None
    patent_number: Optional[str] = None

    status: str = "Filed"
    year: int

    filing_date: date
    publication_date: Optional[date] = None
    grant_date: Optional[date] = None


@router.get("/")
def get_patents(
    db: Session = Depends(get_db),
    current=Depends(get_current_faculty)
):
    patents = db.query(Patent).filter(
        Patent.faculty_id == current["faculty_id"]
    ).all()

    return patents


@router.post("/")
def add_patent(
    p: PatentCreate,
    db: Session = Depends(get_db),
    current=Depends(get_current_faculty)
):

    faculty = db.query(Faculty).filter(
        Faculty.faculty_id == current["faculty_id"]
    ).first()

    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    dept = faculty.department.dept_code if faculty.department else "CSE"

    patent = Patent(
        faculty_id=current["faculty_id"],

        title=p.title,

        dept_code=dept,

        department=p.department,
        school=p.school,

        ipr_type=p.ipr_type,
        title_type=p.title_type,

        application_number=(p.application_number if p.application_number else f"APP-{p.year}-{current['faculty_id']}-{int(date.today().strftime('%d%m%Y'))}"),
        publication_number=p.publication_number,
        patent_number=p.patent_number,

        status=p.status,

        year=p.year,

        filing_date=p.filing_date,
        publication_date=p.publication_date,
        grant_date=p.grant_date,
    )

    db.add(patent)
    db.commit()
    db.refresh(patent)

    return {
        "message": "Patent added successfully",
        "patent_id": patent.patent_id
    }


@router.delete("/{patent_id}")
def delete_patent(
    patent_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_faculty)
):
    patent = db.query(Patent).filter(
        Patent.patent_id == patent_id,
        Patent.faculty_id == current["faculty_id"]
    ).first()

    if not patent:
        raise HTTPException(status_code=404, detail="Patent not found")

    db.delete(patent)
    db.commit()

    return {"message": "Patent deleted"}