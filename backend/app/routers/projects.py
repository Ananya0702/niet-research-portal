from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Project
from app.routers.auth import get_current_faculty
from pydantic import BaseModel
from typing import Optional
from datetime import date
from app.routers.activity import log_activity

router = APIRouter()

class ProjectCreate(BaseModel):
    title:        str
    sponsor_type: str = "Govt. Grants"
    sponsor_name: str = ""
    amount_lakhs: float = 0
    status:       str = "Ongoing"
    start_date:   Optional[date] = None
    end_date:     Optional[date] = None
    faculty_id:   Optional[int] = None
    dept_id:      Optional[int] = None

@router.get("/")
def get_projects(db: Session = Depends(get_db),
                 current=Depends(get_current_faculty)):
    return db.query(Project).filter(
        Project.faculty_id == current["faculty_id"]
    ).all()

@router.post("/")
def add_project(p: ProjectCreate, db: Session = Depends(get_db),
                current=Depends(get_current_faculty)):
    project = Project(
        faculty_id   = current["faculty_id"],
        title        = p.title,
        sponsor_type = p.sponsor_type,
        sponsor_name = p.sponsor_name,
        amount_lakhs = p.amount_lakhs,
        status       = p.status,
        start_date   = p.start_date,
        end_date     = p.end_date,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    log_activity(db, current["faculty_id"], "project_added",
             f"Added project: {p.title[:60]}")
    return {"message": "Project added", "project_id": project.project_id}

@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db),
                   current=Depends(get_current_faculty)):
    p = db.query(Project).filter(
        Project.project_id == project_id,
        Project.faculty_id == current["faculty_id"]
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(p)
    db.commit()
    return {"message": "Deleted"}