from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.database import get_db, Base
from app.models import Faculty, Department, School, Publication, CitationYearly, Project, Patent
from app.security import get_password_hash, verify_password, create_access_token, decode_token
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional, List
from collections import defaultdict

router = APIRouter()

# ── Admin model ──────────────────────────────────────────────────────────────
class Admin(Base):
    __tablename__ = "admins"
    admin_id      = Column(Integer, primary_key=True)
    username      = Column(String(50), unique=True)
    email         = Column(String(150), unique=True)
    password_hash = Column(String(255))
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, server_default=func.now())

# ── Schemas ───────────────────────────────────────────────────────────────────
class AdminLogin(BaseModel):
    email:    str
    password: str

class FacultyCreate(BaseModel):
    name:              str
    email:             str
    password:          str
    role:              str = "faculty"
    designation:       str = "Assistant Professor"
    dept_id:           Optional[int] = None
    is_phd:            bool = False
    joining_year:      Optional[int] = None
    google_scholar_id: Optional[str] = None

class SchoolCreate(BaseModel):
    school_name: str

class DeptCreate(BaseModel):
    school_id:        int
    dept_code:        str
    dept_name:        str
    hod_faculty_id:   Optional[int] = None
    established_year: Optional[int] = None

class DeptUpdate(BaseModel):
    school_id:        Optional[int] = None
    dept_code:        Optional[str] = None
    dept_name:        Optional[str] = None
    hod_faculty_id:   Optional[int] = None
    established_year: Optional[int] = None

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/admin/login")

def get_current_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_token(token)
    if not payload or payload.get("type") != "admin":
        raise HTTPException(status_code=401, detail="Admin access required")
    return payload

# ── Admin Login ───────────────────────────────────────────────────────────────
@router.post("/login")
def admin_login(req: AdminLogin, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.email == req.email).first()
    if not admin or not verify_password(req.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "admin_id": admin.admin_id,
        "email":    admin.email,
        "type":     "admin",
    })
    return {
        "access_token": token,
        "token_type":   "bearer",
        "admin_id":     admin.admin_id,
        "email":        admin.email,
    }

# ── Dashboard overview ───────────────────────────────────────────────────────
@router.get("/dashboard")
def admin_dashboard(db: Session = Depends(get_db),
                    current=Depends(get_current_admin)):
    total_faculty   = db.query(Faculty).filter(Faculty.is_active == True).count()
    total_pubs      = db.query(Publication).count()
    pubs_this_year  = db.query(Publication).filter(Publication.year == 2024).count()
    total_cits      = db.query(func.sum(CitationYearly.citations_count)).scalar() or 0
    total_projects  = db.query(Project).count()
    total_patents   = db.query(Patent).count()
    total_depts     = db.query(Department).count()
    total_schools   = db.query(School).count()
    phd_count       = db.query(Faculty).filter(Faculty.is_phd == True, Faculty.is_active == True).count()

    dept_breakdown = []
    for d in db.query(Department).all():
        fac_count = db.query(Faculty).filter(Faculty.dept_id == d.dept_id, Faculty.is_active == True).count()
        pub_count = db.query(Publication).filter(
            Publication.faculty_id.in_(
                db.query(Faculty.faculty_id).filter(Faculty.dept_id == d.dept_id)
            )
        ).count()
        hod = db.query(Faculty).filter(Faculty.faculty_id == d.hod_faculty_id).first()
        dept_breakdown.append({
            "dept_id":   d.dept_id,
            "dept_name": d.dept_name,
            "dept_code": d.dept_code,
            "faculty_count": fac_count,
            "publications":  pub_count,
            "hod_name":      hod.name if hod else None,
        })

    return {
        "kpis": {
            "total_faculty":    total_faculty,
            "total_publications": total_pubs,
            "publications_this_year": pubs_this_year,
            "total_citations":  int(total_cits),
            "total_projects":   total_projects,
            "total_patents":    total_patents,
            "total_departments": total_depts,
            "total_schools":    total_schools,
            "phd_faculty":      phd_count,
        },
        "dept_breakdown": dept_breakdown,
    }

# ── Faculty CRUD ─────────────────────────────────────────────────────────────
@router.get("/faculty")
def get_all_faculty(db: Session = Depends(get_db),
                    current=Depends(get_current_admin)):
    faculty = db.query(Faculty).order_by(Faculty.dept_id, Faculty.name).all()
    depts = {d.dept_id: d.dept_name for d in db.query(Department).all()}
    return [
        {
            "faculty_id":        f.faculty_id,
            "name":              f.name,
            "email":             f.email,
            "role":              f.role,
            "designation":       f.designation,
            "dept_id":           f.dept_id,
            "dept_name":         depts.get(f.dept_id, "—"),
            "is_phd":            f.is_phd,
            "joining_year":      f.joining_year,
            "google_scholar_id": f.google_scholar_id,
            "is_active":         f.is_active,
        }
        for f in faculty
    ]

@router.post("/faculty")
def create_faculty(data: FacultyCreate, db: Session = Depends(get_db),
                   current=Depends(get_current_admin)):
    existing = db.query(Faculty).filter(Faculty.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    faculty = Faculty(
        name              = data.name,
        email             = data.email,
        password_hash     = get_password_hash(data.password),
        role              = data.role,
        designation       = data.designation,
        dept_id           = data.dept_id,
        is_phd            = data.is_phd,
        joining_year      = data.joining_year,
        google_scholar_id = data.google_scholar_id,
        is_active         = True,
        h_index           = 0,
        i10_index         = 0,
        total_publications= 0,
        total_citations   = 0,
    )
    db.add(faculty)
    db.commit()
    db.refresh(faculty)
    return {
        "message":    "Faculty created successfully",
        "faculty_id": faculty.faculty_id,
        "email":      faculty.email,
    }

@router.put("/faculty/{faculty_id}")
def update_faculty(faculty_id: int, data: dict,
                   db: Session = Depends(get_db),
                   current=Depends(get_current_admin)):
    faculty = db.query(Faculty).filter(
        Faculty.faculty_id == faculty_id
    ).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    allowed = ["name","designation","dept_id","is_phd",
               "joining_year","google_scholar_id","role","is_active"]
    for key in allowed:
        if key in data:
            setattr(faculty, key, data[key])

    if "password" in data and data["password"]:
        faculty.password_hash = get_password_hash(data["password"])

    db.commit()
    return {"message": "Updated successfully"}

@router.delete("/faculty/{faculty_id}")
def delete_faculty(faculty_id: int, hard: bool = False,
                   db: Session = Depends(get_db),
                   current=Depends(get_current_admin)):
    faculty = db.query(Faculty).filter(
        Faculty.faculty_id == faculty_id
    ).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Not found")

    if hard:
        db.delete(faculty)
    else:
        faculty.is_active = False
    db.commit()
    return {"message": "Faculty deleted" if hard else "Faculty deactivated"}

# ── Schools CRUD ─────────────────────────────────────────────────────────────
@router.get("/schools")
def get_schools(db: Session = Depends(get_db),
                current=Depends(get_current_admin)):
    schools = db.query(School).all()
    result = []
    for s in schools:
        depts = db.query(Department).filter(Department.school_id == s.school_id).all()
        result.append({
            "school_id":   s.school_id,
            "school_name": s.school_name,
            "department_count": len(depts),
            "departments": [
                {
                    "dept_id":   d.dept_id,
                    "dept_code": d.dept_code,
                    "dept_name": d.dept_name,
                    "hod_faculty_id": d.hod_faculty_id,
                }
                for d in depts
            ],
        })
    return result

@router.post("/schools")
def create_school(data: SchoolCreate, db: Session = Depends(get_db),
                  current=Depends(get_current_admin)):
    existing = db.query(School).filter(School.school_name == data.school_name).first()
    if existing:
        raise HTTPException(status_code=400, detail="School already exists")
    school = School(school_name=data.school_name)
    db.add(school)
    db.commit()
    db.refresh(school)
    return {"school_id": school.school_id, "school_name": school.school_name}

@router.put("/schools/{school_id}")
def update_school(school_id: int, data: SchoolCreate,
                  db: Session = Depends(get_db),
                  current=Depends(get_current_admin)):
    school = db.query(School).filter(School.school_id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    school.school_name = data.school_name
    db.commit()
    return {"message": "School updated"}

@router.delete("/schools/{school_id}")
def delete_school(school_id: int, db: Session = Depends(get_db),
                  current=Depends(get_current_admin)):
    school = db.query(School).filter(School.school_id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    dept_count = db.query(Department).filter(Department.school_id == school_id).count()
    if dept_count > 0:
        raise HTTPException(status_code=400, detail="Remove all departments in this school first")
    db.delete(school)
    db.commit()
    return {"message": "School deleted"}

# ── Departments CRUD ─────────────────────────────────────────────────────────
@router.get("/departments")
def get_departments(db: Session = Depends(get_db),
                    current=Depends(get_current_admin)):
    depts = db.query(Department).all()
    schools = {s.school_id: s.school_name for s in db.query(School).all()}
    return [
        {
            "dept_id":     d.dept_id,
            "school_id":   d.school_id,
            "school_name": schools.get(d.school_id),
            "dept_code":   d.dept_code,
            "dept_name":   d.dept_name,
            "hod_faculty_id": d.hod_faculty_id,
            "established_year": d.established_year,
        }
        for d in depts
    ]

@router.post("/departments")
def create_department(data: DeptCreate, db: Session = Depends(get_db),
                      current=Depends(get_current_admin)):
    dept = Department(
        school_id        = data.school_id,
        dept_code        = data.dept_code,
        dept_name        = data.dept_name,
        hod_faculty_id   = data.hod_faculty_id,
        established_year = data.established_year,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return {"dept_id": dept.dept_id, "message": "Department created"}

@router.put("/departments/{dept_id}")
def update_department(dept_id: int, data: DeptUpdate,
                      db: Session = Depends(get_db),
                      current=Depends(get_current_admin)):
    dept = db.query(Department).filter(Department.dept_id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    for key, val in data.dict(exclude_unset=True).items():
        setattr(dept, key, val)
    db.commit()
    return {"message": "Department updated"}

@router.delete("/departments/{dept_id}")
def delete_department(dept_id: int, db: Session = Depends(get_db),
                      current=Depends(get_current_admin)):
    dept = db.query(Department).filter(Department.dept_id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    fac_count = db.query(Faculty).filter(Faculty.dept_id == dept_id).count()
    if fac_count > 0:
        raise HTTPException(status_code=400, detail="Remove all faculty in this department first")
    db.delete(dept)
    db.commit()
    return {"message": "Department deleted"}
