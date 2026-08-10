from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.database import get_db, Base
from app.models import Faculty, Department, School, Publication, CitationYearly, Project, Patent, SecurityAuditLog
from app.security import get_password_hash, verify_password, create_access_token, decode_token
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime as dt
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
    orcid_id:          Optional[str] = None
    scopus_author_id:  Optional[str] = None

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
    cur_year        = dt.now().year
    pubs_this_year  = db.query(Publication).filter(Publication.year == cur_year).count()
    total_cits      = db.query(func.sum(Publication.citations_count)).scalar() or 0
    total_projects  = db.query(Project).count()
    total_patents   = db.query(Patent).count()
    total_depts     = db.query(Department).count()
    total_schools   = db.query(School).count()
    phd_count       = db.query(Faculty).filter(Faculty.is_phd == True, Faculty.is_active == True).count()

    # Year-over-year growth from real data
    from app.metrics import yoy_percent
    pubs_by_year = dict(
        db.query(Publication.year, func.count(Publication.pub_id))
        .filter(Publication.year != None).group_by(Publication.year).all()
    )
    cit_by_year = dict(
        db.query(Publication.year, func.sum(Publication.citations_count))
        .filter(Publication.year != None).group_by(Publication.year).all()
    )
    pubs_growth = yoy_percent(pubs_by_year)
    cits_growth = yoy_percent(cit_by_year)

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
            "growth": {
                "publications": pubs_growth,
                "citations":    cits_growth,
            },
        },
        "dept_breakdown": dept_breakdown,
    }

# ── Faculty CRUD ─────────────────────────────────────────────────────────────
@router.get("/faculty")
def get_all_faculty(db: Session = Depends(get_db),
                    current=Depends(get_current_admin)):
    faculty = db.query(Faculty).order_by(Faculty.dept_id, Faculty.name).all()
    depts = {d.dept_id: d.dept_name for d in db.query(Department).all()}
    schools = {s.school_id: s.school_name for s in db.query(School).all()}
    return [
        {
            "faculty_id":        f.faculty_id,
            "name":              f.name,
            "email":             f.email,
            "role":              f.role,
            "designation":       f.designation,
            "dept_id":           f.dept_id,
            "dept_name":         depts.get(f.dept_id, "—"),
            "school_id":         f.school_id,
            "school_name":       schools.get(f.school_id, "—"),
            "is_phd":            f.is_phd,
            "joining_year":      f.joining_year,
            "google_scholar_id": f.google_scholar_id,
            "orcid_id":          f.orcid_id,
            "scopus_author_id":  f.scopus_author_id,
            "scholar_connected": f.scholar_connected,
            "orcid_connected":   f.orcid_connected,
            "scopus_connected":  f.scopus_connected,
            "scholar_sync_status": f.scholar_sync_status,
            "orcid_sync_status":   f.orcid_sync_status,
            "scopus_sync_status":  f.scopus_sync_status,
            "last_scholar_sync":   f.last_scholar_sync.isoformat() if f.last_scholar_sync else None,
            "last_orcid_sync":     f.last_orcid_sync.isoformat() if f.last_orcid_sync else None,
            "last_scopus_sync":    f.last_scopus_sync.isoformat() if f.last_scopus_sync else None,
            "is_active":         f.is_active,
            "mobile_number":     f.mobile_number,
            "phone":             f.phone,
            "employee_id":       f.employee_id,
            "email_verified":    bool(f.email_verified),
            "mobile_verified":   bool(f.mobile_verified),
            "last_password_changed": f.last_password_changed.isoformat() if f.last_password_changed else None,
            "force_password_reset":  bool(f.force_password_reset),
            "failed_attempts":   f.failed_attempts or 0,
            "locked":            bool(f.lock_until and f.lock_until > dt.now()),
            "lock_until":        f.lock_until.isoformat() if f.lock_until else None,
        }
        for f in faculty
    ]

@router.get("/faculty/platform-status/{faculty_id}")
def faculty_platform_status(faculty_id: int, db: Session = Depends(get_db),
                            current=Depends(get_current_admin)):
    """Aggregate research-platform connection status for one faculty member."""
    faculty = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Not found")

    from app.models import PublicationSource
    platform_pubs = {}
    rows = db.query(PublicationSource.platform, func.count(PublicationSource.id)).group_by(
        PublicationSource.platform
    ).join(Publication, PublicationSource.pub_id == Publication.pub_id).filter(
        Publication.faculty_id == faculty_id
    ).all()
    for plat, cnt in rows:
        platform_pubs[plat] = cnt

    return {
        "faculty_id": faculty.faculty_id,
        "platforms": [
            {
                "platform":       "google_scholar",
                "label":          "Google Scholar",
                "connected":      bool(faculty.scholar_connected),
                "sync_status":    faculty.scholar_sync_status,
                "last_sync":      faculty.last_scholar_sync.isoformat() if faculty.last_scholar_sync else None,
                "publications":   platform_pubs.get("google_scholar", 0),
                "account_id":     faculty.google_scholar_id,
            },
            {
                "platform":       "orcid",
                "label":          "ORCID",
                "connected":      bool(faculty.orcid_connected),
                "sync_status":    faculty.orcid_sync_status,
                "last_sync":      faculty.last_orcid_sync.isoformat() if faculty.last_orcid_sync else None,
                "publications":   platform_pubs.get("orcid", 0),
                "account_id":     faculty.orcid_id,
            },
            {
                "platform":       "scopus",
                "label":          "Scopus",
                "connected":      bool(faculty.scopus_connected),
                "sync_status":    faculty.scopus_sync_status,
                "last_sync":      faculty.last_scopus_sync.isoformat() if faculty.last_scopus_sync else None,
                "publications":   platform_pubs.get("scopus", 0),
                "account_id":     faculty.scopus_author_id,
            },
        ],
    }


@router.post("/faculty/sync/{faculty_id}/{platform}")
def admin_force_sync(faculty_id: int, platform: str,
                     db: Session = Depends(get_db),
                     current=Depends(get_current_admin)):
    """Admin-triggered sync for a faculty member on a given platform."""
    if platform not in ("google_scholar", "orcid", "scopus"):
        raise HTTPException(status_code=400, detail="Unsupported platform")
    faculty = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    from app.routers.sync import _do_sync, ProviderError
    id_field = {
        "google_scholar": "google_scholar_id",
        "orcid": "orcid_id",
        "scopus": "scopus_author_id",
    }[platform]
    account_id = getattr(faculty, id_field, None)
    if not account_id:
        raise HTTPException(status_code=400, detail=f"No {platform} ID set for this faculty")

    try:
        result = _do_sync(platform, faculty, db)
        return result
    except ProviderError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/faculty/sync-status/{faculty_id}")
def faculty_sync_status(faculty_id: int, db: Session = Depends(get_db),
                        current=Depends(get_current_admin)):
    faculty = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "faculty_id": faculty.faculty_id,
        "scholar_sync_status": faculty.scholar_sync_status,
        "orcid_sync_status":   faculty.orcid_sync_status,
        "scopus_sync_status":  faculty.scopus_sync_status,
        "last_scholar_sync":   faculty.last_scholar_sync.isoformat() if faculty.last_scholar_sync else None,
        "last_orcid_sync":     faculty.last_orcid_sync.isoformat() if faculty.last_orcid_sync else None,
        "last_scopus_sync":    faculty.last_scopus_sync.isoformat() if faculty.last_scopus_sync else None,
    }


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
        orcid_id          = data.orcid_id,
        scopus_author_id  = data.scopus_author_id,
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

    allowed = ["name","designation","dept_id","school_id","is_phd",
               "joining_year","google_scholar_id","orcid_id",
               "scopus_author_id","role","is_active"]
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

# ── Faculty Details (publications with descriptions) ────────────────────────
@router.get("/faculty-details")
def get_faculty_details(db: Session = Depends(get_db),
                        current=Depends(get_current_admin)):
    """Return all active faculty with their publications, each including
       a generated description and citation data."""
    faculty_list = db.query(Faculty).filter(Faculty.is_active == True).order_by(Faculty.name).all()
    depts = {d.dept_id: d.dept_name for d in db.query(Department).all()}

    result = []
    for f in faculty_list:
        pubs = db.query(Publication).filter(
            Publication.faculty_id == f.faculty_id
        ).order_by(Publication.year.desc()).all()

        pub_list = []
        for p in pubs:
            pd = {
                "pub_id":      p.pub_id,
                "title":       p.title,
                "journal_name": p.journal_name or "",
                "conference_name": p.conference_name or "",
                "year":        p.year,
                "citations_count": p.citations_count or 0,
                "publication_type": p.publication_type or "",
                "doi":         p.doi or "",
                "indexing":    p.indexing or "None",
                "quartile":    p.quartile or "N/A",
                "keywords":    p.keywords or "",
                "abstract":    p.abstract or "",
                "ml_topic":    p.ml_topic or "",
                "research_area": p.research_area or "",
                "publisher":   p.publisher or "",
                "volume":      p.volume or "",
                "issue":       p.issue or "",
                "pages":       p.pages or "",
                "issn":        p.issn or "",
                "isbn":        p.isbn or "",
                "status":      p.status or "Published",
            }
            # Generate description (same logic as publications.py)
            desc_parts = []
            if not p.abstract:
                if p.ml_topic:
                    desc_parts.append(f"This research focuses on {p.ml_topic}.")
                if p.research_area:
                    desc_parts.append(f"It falls under the research area of {p.research_area}.")
                if p.keywords:
                    kw_list = [k.strip() for k in p.keywords.split(",") if k.strip()]
                    if kw_list:
                        desc_parts.append(f"Key topics include {', '.join(kw_list[:6])}.")
                venue = p.conference_name or p.journal_name or ""
                if venue and venue != "Unknown Journal":
                    desc_parts.append(f"Published in {venue} ({p.year}).")
                elif p.year:
                    desc_parts.append(f"Published in {p.year}.")
                pd["description"] = " ".join(desc_parts) if desc_parts else p.title
            else:
                pd["description"] = p.abstract

            # Citation yearly distribution
            from app.models import CitationYearly
            fac_yearly = db.query(CitationYearly).filter(
                CitationYearly.faculty_id == f.faculty_id
            ).order_by(CitationYearly.year).all()
            if fac_yearly and (p.citations_count or 0) > 0:
                total_fac_cit = sum(c.citations_count for c in fac_yearly)
                pd["citations_by_year"] = [
                    {"year": c.year, "count": round((p.citations_count or 0) * c.citations_count / total_fac_cit)}
                    for c in fac_yearly
                ]
                pd["total_citations"] = p.citations_count or 0
            else:
                pd["citations_by_year"] = []
                pd["total_citations"] = p.citations_count or 0

            from app.source_filter import pub_sources_by_pub
            pd["sources"] = pub_sources_by_pub(db, [p.pub_id]).get(p.pub_id, [])
            pd["source_platform"] = p.source_platform or "manual"
            pd["external_url"] = p.external_url or ""

            pub_list.append(pd)

        result.append({
            "faculty_id":   f.faculty_id,
            "name":         f.name,
            "email":        f.email,
            "role":         f.role,
            "designation":  f.designation,
            "dept_id":      f.dept_id,
            "dept_name":    depts.get(f.dept_id, "—"),
            "school_id":    f.school_id,
            "is_phd":       f.is_phd,
            "h_index":      f.h_index or 0,
            "total_publications": len(pub_list),
            "total_citations":    sum(pd.get("total_citations") or 0 for pd in pub_list),
            "google_scholar_id":  f.google_scholar_id,
            "orcid_id":           f.orcid_id,
            "scopus_author_id":   f.scopus_author_id,
            "scholar_connected":  bool(f.scholar_connected),
            "orcid_connected":    bool(f.orcid_connected),
            "scopus_connected":   bool(f.scopus_connected),
            "last_scholar_sync":  f.last_scholar_sync.isoformat() if f.last_scholar_sync else None,
            "last_orcid_sync":    f.last_orcid_sync.isoformat() if f.last_orcid_sync else None,
            "last_scopus_sync":   f.last_scopus_sync.isoformat() if f.last_scopus_sync else None,
            "publications": pub_list,
        })

    return result


# ── Security management (admin) ──────────────────────────────────────────────
class AdminResetPassword(BaseModel):
    new_password: str

class AdminVerifyContact(BaseModel):
    field: str  # email | mobile

class AdminSendResetEmail(BaseModel):
    pass

@router.get("/security/overview")
def security_overview(db: Session = Depends(get_db),
                      current=Depends(get_current_admin)):
    """Summary stats for the admin security panel."""
    now = dt.now()
    faculty = db.query(Faculty).all()
    locked = [f for f in faculty if f.lock_until and f.lock_until > now]
    force = [f for f in faculty if f.force_password_reset]
    unverified_email = [f for f in faculty if f.email and not f.email_verified]
    unverified_mobile = [f for f in faculty if f.mobile_number and not f.mobile_verified]
    otp_count = db.query(func.count(SecurityAuditLog.log_id)).filter(
        SecurityAuditLog.action.in_(["otp_generated"])).scalar() or 0
    return {
        "total_faculty": len(faculty),
        "locked_accounts": len(locked),
        "force_reset": len(force),
        "unverified_email": len(unverified_email),
        "unverified_mobile": len(unverified_mobile),
        "otp_sent_total": otp_count,
        "failed_logins": db.query(func.count(SecurityAuditLog.log_id)).filter(
            SecurityAuditLog.action == "login_failed").scalar() or 0,
    }


@router.get("/security/logs")
def security_logs(scope: str = "all", faculty_id: Optional[int] = None,
                  limit: int = 100,
                  db: Session = Depends(get_db),
                  current=Depends(get_current_admin)):
    q = db.query(SecurityAuditLog)
    if scope == "otp":
        q = q.filter(SecurityAuditLog.action.in_(["otp_generated", "otp_verified", "otp_failed"]))
    elif scope == "password":
        q = q.filter(SecurityAuditLog.action.in_(["password_changed", "password_reset", "forced_reset"]))
    elif scope == "login":
        q = q.filter(SecurityAuditLog.action.in_(["login_success", "login_failed", "account_locked"]))
    if faculty_id:
        q = q.filter(SecurityAuditLog.faculty_id == faculty_id)
    rows = q.order_by(SecurityAuditLog.log_id.desc()).limit(min(limit, 500)).all()
    names = {f.faculty_id: f.name for f in db.query(Faculty).all()}
    return [
        {
            "log_id": r.log_id,
            "faculty_id": r.faculty_id,
            "faculty_name": names.get(r.faculty_id, "—"),
            "action": r.action,
            "status": r.status,
            "method": r.method,
            "detail": r.detail,
            "ip_address": r.ip_address,
            "browser": r.browser,
            "device": r.device,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.get("/security/faculty/{faculty_id}")
def security_faculty_status(faculty_id: int, db: Session = Depends(get_db),
                            current=Depends(get_current_admin)):
    f = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Faculty not found")
    return {
        "faculty_id": f.faculty_id,
        "name": f.name,
        "email": f.email,
        "email_verified": bool(f.email_verified),
        "mobile_number": f.mobile_number,
        "mobile_verified": bool(f.mobile_verified),
        "force_password_reset": bool(f.force_password_reset),
        "failed_attempts": f.failed_attempts or 0,
        "locked": bool(f.lock_until and f.lock_until > dt.now()),
        "lock_until": f.lock_until.isoformat() if f.lock_until else None,
        "last_password_changed": f.last_password_changed.isoformat() if f.last_password_changed else None,
    }


@router.post("/security/faculty/{faculty_id}/verify-contact")
def security_verify_contact(faculty_id: int, payload: AdminVerifyContact,
                            db: Session = Depends(get_db),
                            current=Depends(get_current_admin)):
    f = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Faculty not found")
    if payload.field == "email":
        if not f.email:
            raise HTTPException(status_code=400, detail="No email to verify")
        f.email_verified = True
    elif payload.field == "mobile":
        if not f.mobile_number:
            raise HTTPException(status_code=400, detail="No mobile number to verify")
        f.mobile_verified = True
    else:
        raise HTTPException(status_code=400, detail="Invalid field")
    db.commit()
    db.add(SecurityAuditLog(faculty_id=faculty_id, action="contact_verified",
                            status="success", method=payload.field,
                            detail=f"Admin verified {payload.field}",
                            ip_address=current.get("email", "admin")))
    db.commit()
    return {"message": f"{payload.field} verified"}


@router.post("/security/faculty/{faculty_id}/reset-password")
def security_admin_reset_password(faculty_id: int, payload: AdminResetPassword,
                                  db: Session = Depends(get_db),
                                  current=Depends(get_current_admin)):
    from app.security_otp import parse_user_agent
    from app.notifier import password_reset_email
    from app.password_policy import policy_errors, record_password
    f = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Faculty not found")
    errors = policy_errors(payload.new_password)
    if errors:
        raise HTTPException(status_code=400, detail=errors[0])
    from app.security import get_password_hash as gph
    record_password(f, f.password_hash or "")
    f.password_hash = gph(payload.new_password)
    f.last_password_changed = dt.now()
    f.token_version = (f.token_version or 0) + 1
    f.failed_attempts = 0
    f.lock_until = None
    f.force_password_reset = False
    f.otp_hash = None
    db.commit()
    db.add(SecurityAuditLog(faculty_id=faculty_id, action="password_reset",
                            status="success",
                            detail="Password reset by administrator",
                            ip_address=current.get("email", "admin")))
    db.commit()
    try:
        password_reset_email(f.email, {
            "date": dt.now().strftime("%d %b %Y"),
            "time": dt.now().strftime("%I:%M %p"),
            "ip": current.get("email", "admin"),
            "browser": "Administrator",
            "device": "Admin Console",
        })
    except Exception:
        pass
    return {"message": "Password reset successfully"}


@router.post("/security/faculty/{faculty_id}/force-reset")
def security_force_reset(faculty_id: int, db: Session = Depends(get_db),
                         current=Depends(get_current_admin)):
    from app.notifier import force_reset_email
    f = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Faculty not found")
    f.force_password_reset = True
    f.token_version = (f.token_version or 0) + 1  # log them out
    db.commit()
    db.add(SecurityAuditLog(faculty_id=faculty_id, action="forced_reset",
                            status="success", detail="Force password reset requested by admin",
                            ip_address=current.get("email", "admin")))
    db.commit()
    try:
        force_reset_email(f.email, {
            "date": dt.now().strftime("%d %b %Y"),
            "requested_by": current.get("email", "Administrator"),
        })
    except Exception:
        pass
    return {"message": "Force password reset requested. User will be logged out."}


@router.post("/security/faculty/{faculty_id}/unlock")
def security_unlock(faculty_id: int, db: Session = Depends(get_db),
                    current=Depends(get_current_admin)):
    from app.notifier import account_unlocked_email
    f = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Faculty not found")
    f.lock_until = None
    f.failed_attempts = 0
    db.commit()
    db.add(SecurityAuditLog(faculty_id=faculty_id, action="account_unlocked",
                            status="success", detail="Account unlocked by administrator",
                            ip_address=current.get("email", "admin")))
    db.commit()
    try:
        account_unlocked_email(f.email, {
            "date": dt.now().strftime("%d %b %Y"),
            "requested_by": current.get("email", "Administrator"),
        })
    except Exception:
        pass
    return {"message": "Account unlocked"}

# ── Bulk Import (CSV / XLSX) ────────────────────────────────────────────────
class ImportRequest(BaseModel):
    mode:    str = "upsert"        # insert | update | upsert
    dry_run: bool = True
    rows:    List[dict] = []

@router.post("/import/{entity}")
def bulk_import(entity: str, req: ImportRequest,
                db: Session = Depends(get_db),
                current=Depends(get_current_admin)):
    """Import rows (JSON array of dicts) for schools | departments | faculty."""
    from app.bulk_import import run_import
    try:
        return run_import(db, entity, req.rows, req.mode, req.dry_run,
                          actor=current.get("email", "admin"))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/import/{entity}/file")
def bulk_import_file(entity: str,
                     file: UploadFile = File(...),
                     mode: str = Form("upsert"),
                     dry_run: bool = Form(False),
                     db: Session = Depends(get_db),
                     current=Depends(get_current_admin)):
    """Import from an uploaded CSV or XLSX file."""
    from app.bulk_import import run_import, parse_rows
    content = file.file.read()
    rows = parse_rows(file.filename or "upload.csv", content)
    try:
        return run_import(db, entity, rows, mode, dry_run,
                          actor=current.get("email", "admin"))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/import/template/{entity}")
def import_template(entity: str,
                    sample: bool = False,
                    fmt: str = "csv",
                    current=Depends(get_current_admin)):
    """Download an import template (CSV or XLSX) for the given entity."""
    from app.bulk_import import generate_template_csv, generate_template_xlsx
    if fmt == "xlsx":
        data = generate_template_xlsx(entity, sample)
        return Response(content=data, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        headers={"Content-Disposition": f'attachment; filename="{entity}_template.xlsx"'})
    try:
        data = generate_template_csv(entity, sample)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return Response(content=data, media_type="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="{entity}_template.csv"'})
