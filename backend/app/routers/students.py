from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import Session
from app.database import get_db, Base
from app.dependencies import get_current_faculty
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class StudentResearcher(Base):
    __tablename__ = "student_researchers"
    student_id       = Column(Integer, primary_key=True)
    dept_id          = Column(Integer, nullable=True)
    guide_faculty_id = Column(Integer, ForeignKey("faculty.faculty_id"), nullable=True)
    name             = Column(String(100))
    enrollment_no    = Column(String(50), unique=True)
    degree           = Column(String(20), default="PhD")
    status           = Column(String(20), default="Active")
    year_joined      = Column(Integer)
    thesis_title     = Column(String(300), nullable=True)

class StudentCreate(BaseModel):
    name:          str
    enrollment_no: str
    degree:        str = "PhD"
    status:        str = "Active"
    year_joined:   int
    thesis_title:  Optional[str] = None

@router.get("/")
def get_students(db: Session = Depends(get_db),
                 current=Depends(get_current_faculty)):
    students = db.query(StudentResearcher).filter(
        StudentResearcher.guide_faculty_id == current["faculty_id"]
    ).all()
    return [
        {
            "student_id":    s.student_id,
            "name":          s.name,
            "enrollment_no": s.enrollment_no,
            "degree":        s.degree,
            "status":        s.status,
            "year_joined":   s.year_joined,
            "thesis_title":  s.thesis_title,
        }
        for s in students
    ]

@router.post("/")
def add_student(s: StudentCreate, db: Session = Depends(get_db),
                current=Depends(get_current_faculty)):
    existing = db.query(StudentResearcher).filter(
        StudentResearcher.enrollment_no == s.enrollment_no
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Enrollment number already exists")

    student = StudentResearcher(
        guide_faculty_id = current["faculty_id"],
        dept_id          = current.get("dept_id"),
        name             = s.name,
        enrollment_no    = s.enrollment_no,
        degree           = s.degree,
        status           = s.status,
        year_joined      = s.year_joined,
        thesis_title     = s.thesis_title,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return {"message": "Student added", "student_id": student.student_id}

@router.delete("/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db),
                   current=Depends(get_current_faculty)):
    s = db.query(StudentResearcher).filter(
        StudentResearcher.student_id == student_id,
        StudentResearcher.guide_faculty_id == current["faculty_id"]
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(s)
    db.commit()
    return {"message": "Deleted"}