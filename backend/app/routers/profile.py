from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from urllib.parse import urlparse
from app.database import get_db
from app.models import (
    Faculty, Department, School, Publication, FacultyEducation, FacultyExperience,
    FacultyCertification, FacultyAcademicLink, FacultySocialLink,
    FacultyResearchArea, Achievement,
)
from app.dependencies import get_current_faculty
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import os
import shutil
import uuid

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "profiles")
os.makedirs(UPLOAD_DIR, exist_ok=True)

PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
CERT_EXTENSIONS  = {".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024

# ── Helpers ──────────────────────────────────────────────────────────────────
def _get_faculty(db, current):
    fac = db.query(Faculty).filter(Faculty.faculty_id == current["faculty_id"]).first()
    if not fac:
        raise HTTPException(status_code=404, detail="Faculty not found")
    return fac


def _to_date(v):
    if not v:
        return None
    if isinstance(v, date):
        return v
    try:
        return datetime.strptime(str(v)[:10], "%Y-%m-%d").date()
    except Exception:
        return None


def _iso(d):
    return d.isoformat() if d else None


def _org_names(db, fac):
    dept_name = dept_code = None
    school_name = None
    school_id = fac.school_id
    if fac.dept_id:
        dept = db.query(Department).filter(Department.dept_id == fac.dept_id).first()
        if dept:
            dept_name = dept.dept_name
            dept_code = dept.dept_code
            if dept.school:
                school_name = dept.school.school_name
                school_id = dept.school.school_id
    if not school_name and fac.school_id:
        sch = db.query(School).filter(School.school_id == fac.school_id).first()
        if sch:
            school_name = sch.school_name
    return dept_name, dept_code, school_name, school_id


def _save_upload(file: UploadFile, allowed: set) -> str:
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"File type '{ext or 'unknown'}' not allowed")
    stored = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(UPLOAD_DIR, stored)
    with open(dest, "wb") as out:
        shutil.copyfileobj(file.file, out)
    if os.path.getsize(dest) > MAX_FILE_SIZE:
        os.remove(dest)
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    return f"/uploads/profiles/{stored}"


def _completion(db, fac):
    personal_fields = [
        fac.name, fac.designation, fac.phone, fac.dob, fac.gender, fac.nationality,
        fac.employee_id, fac.joining_year, fac.qualification, fac.bio,
        fac.google_scholar_id, fac.orcid_id, fac.scopus_author_id,
    ]
    prof_fields = [
        fac.current_position, fac.office_address, fac.institution, fac.specialization,
        fac.research_interests, fac.biography, fac.languages_spoken,
    ]
    academic_connected = db.query(FacultyAcademicLink).filter(
        FacultyAcademicLink.faculty_id == fac.faculty_id, FacultyAcademicLink.is_connected == True  # noqa: E712
    ).count()
    social_count = db.query(FacultySocialLink).filter(
        FacultySocialLink.faculty_id == fac.faculty_id
    ).count()
    edu_count = db.query(FacultyEducation).filter(FacultyEducation.faculty_id == fac.faculty_id).count()
    exp_count = db.query(FacultyExperience).filter(FacultyExperience.faculty_id == fac.faculty_id).count()
    ach_count = db.query(Achievement).filter(Achievement.faculty_id == fac.faculty_id).count()
    cert_count = db.query(FacultyCertification).filter(FacultyCertification.faculty_id == fac.faculty_id).count()

    def frac(filled, total):
        return filled / total if total else 0.0

    sections = {
        "photo":         fac.profile_photo_url and 5 or 0,
        "personal":      round(frac(sum(1 for f in personal_fields if f), len(personal_fields)) * 20, 1),
        "professional":  round(frac(sum(1 for f in prof_fields if f), len(prof_fields)) * 20, 1),
        "academic_links": 10 if academic_connected else 0,
        "social_links":   min(10, social_count * 2),
        "education":     10 if edu_count else 0,
        "experience":    10 if exp_count else 0,
        "achievements":  10 if ach_count else 0,
        "certifications": 5 if cert_count else 0,
    }
    total = round(sum(sections.values()), 1)
    return {"percent": total, "sections": sections}


# ── Schemas ──────────────────────────────────────────────────────────────────
class PersonalUpdate(BaseModel):
    name:              Optional[str] = None
    designation:       Optional[str] = None
    phone:             Optional[str] = None
    dob:               Optional[str] = None
    gender:            Optional[str] = None
    nationality:       Optional[str] = None
    employee_id:       Optional[str] = None
    joining_year:      Optional[int] = None
    qualification:     Optional[str] = None
    bio:               Optional[str] = None
    google_scholar_id: Optional[str] = None
    orcid_id:          Optional[str] = None
    scopus_author_id:  Optional[str] = None


class ProfessionalUpdate(BaseModel):
    current_position:   Optional[str] = None
    office_address:     Optional[str] = None
    institution:        Optional[str] = None
    specialization:     Optional[str] = None
    research_interests: Optional[str] = None
    biography:          Optional[str] = None
    languages_spoken:   Optional[str] = None


class EducationIn(BaseModel):
    degree:      str
    university:  str = ""
    institute:   str = ""
    year:        Optional[int] = None
    percentage:  Optional[float] = None
    description: str = ""


class EducationUpdate(BaseModel):
    degree:      Optional[str] = None
    university:  Optional[str] = None
    institute:   Optional[str] = None
    year:        Optional[int] = None
    percentage:  Optional[float] = None
    description: Optional[str] = None


class ExperienceIn(BaseModel):
    organization: str
    position:     str = ""
    start_date:   Optional[str] = None
    end_date:     Optional[str] = None
    is_current:   bool = False
    description:  str = ""


class ExperienceUpdate(BaseModel):
    organization: Optional[str] = None
    position:     Optional[str] = None
    start_date:   Optional[str] = None
    end_date:     Optional[str] = None
    is_current:   Optional[bool] = None
    description:  Optional[str] = None


class AchievementIn(BaseModel):
    title:            str
    category:         str = "Achievement"
    issuer:           str = ""
    year:             Optional[int] = None
    amount:           Optional[float] = None
    description:      str = ""
    achievement_date: Optional[str] = None
    certificate_url:  str = ""


class AchievementUpdate(BaseModel):
    title:            Optional[str] = None
    category:         Optional[str] = None
    issuer:           Optional[str] = None
    year:             Optional[int] = None
    amount:           Optional[float] = None
    description:      Optional[str] = None
    achievement_date: Optional[str] = None
    certificate_url:  Optional[str] = None


class CertificationIn(BaseModel):
    name:            str
    issuing_org:     str = ""
    issue_date:      Optional[str] = None
    expiry_date:     Optional[str] = None
    credential_id:   str = ""
    credential_url:  str = ""
    certificate_url: str = ""


class CertificationUpdate(BaseModel):
    name:            Optional[str] = None
    issuing_org:     Optional[str] = None
    issue_date:      Optional[str] = None
    expiry_date:     Optional[str] = None
    credential_id:   Optional[str] = None
    credential_url:  Optional[str] = None
    certificate_url: Optional[str] = None


class ResearchAreaIn(BaseModel):
    area_name: str


# ── Full profile ─────────────────────────────────────────────────────────────
@router.get("/me")
def get_full_profile(db: Session = Depends(get_db),
                     current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    dept_name, dept_code, school_name, school_id = _org_names(db, fac)

    pubs = db.query(Publication).filter(
        Publication.faculty_id == fac.faculty_id
    ).all()
    pub_citations = sum(p.citations_count or 0 for p in pubs)
    from app.metrics import avg_if
    pub_avg_if = avg_if(pubs)

    education = [
        {
            "id": e.education_id, "degree": e.degree, "university": e.university,
            "institute": e.institute, "year": e.year, "percentage": e.percentage,
            "description": e.description,
        }
        for e in db.query(FacultyEducation).filter(FacultyEducation.faculty_id == fac.faculty_id)
        .order_by(FacultyEducation.year.desc()).all()
    ]
    experience = [
        {
            "id": e.experience_id, "organization": e.organization, "position": e.position,
            "start_date": _iso(e.start_date), "end_date": _iso(e.end_date),
            "is_current": e.is_current, "description": e.description,
        }
        for e in db.query(FacultyExperience).filter(FacultyExperience.faculty_id == fac.faculty_id)
        .order_by(FacultyExperience.is_current.desc(), FacultyExperience.start_date.desc()).all()
    ]
    achievements = [
        {
            "id": a.achievement_id, "title": a.title, "category": a.category,
            "issuer": a.issuer, "year": a.year, "amount": a.amount,
            "description": a.description, "achievement_date": _iso(a.achievement_date),
            "certificate_url": a.certificate_url,
        }
        for a in db.query(Achievement).filter(Achievement.faculty_id == fac.faculty_id)
        .order_by(Achievement.year.desc()).all()
    ]
    certifications = [
        {
            "id": c.cert_id, "name": c.name, "issuing_org": c.issuing_org,
            "issue_date": _iso(c.issue_date), "expiry_date": _iso(c.expiry_date),
            "credential_id": c.credential_id, "credential_url": c.credential_url,
            "certificate_url": c.certificate_url,
        }
        for c in db.query(FacultyCertification).filter(FacultyCertification.faculty_id == fac.faculty_id).all()
    ]
    research_areas = [
        {"id": r.id, "area_name": r.area_name, "pub_count": r.pub_count}
        for r in db.query(FacultyResearchArea).filter(FacultyResearchArea.faculty_id == fac.faculty_id)
        .order_by(FacultyResearchArea.pub_count.desc()).all()
    ]
    academic_links = [
        {"id": l.link_id, "platform": l.platform, "url": l.url, "is_connected": l.is_connected}
        for l in db.query(FacultyAcademicLink).filter(FacultyAcademicLink.faculty_id == fac.faculty_id).all()
    ]
    social_links = [
        {"id": l.link_id, "platform": l.platform, "url": l.url}
        for l in db.query(FacultySocialLink).filter(FacultySocialLink.faculty_id == fac.faculty_id).all()
    ]

    completion = _completion(db, fac)

    return {
        "faculty_id":         fac.faculty_id,
        "name":               fac.name,
        "email":              fac.email,
        "designation":        fac.designation,
        "role":               fac.role,
        "dept_id":            fac.dept_id,
        "dept_name":          dept_name,
        "dept_code":          dept_code,
        "school_id":          school_id,
        "school_name":        school_name,
        "is_phd":             fac.is_phd,
        "joining_year":       fac.joining_year,
        "google_scholar_id":  fac.google_scholar_id,
        "orcid_id":           fac.orcid_id,
        "scopus_author_id":   fac.scopus_author_id,
        "platform_status": {
            "google_scholar": {
                "connected":  bool(fac.scholar_connected),
                "sync_status": fac.scholar_sync_status,
                "last_sync":  _iso(fac.last_scholar_sync),
                "account_id": fac.google_scholar_id,
            },
            "orcid": {
                "connected":  bool(fac.orcid_connected),
                "sync_status": fac.orcid_sync_status,
                "last_sync":  _iso(fac.last_orcid_sync),
                "account_id": fac.orcid_id,
            },
            "scopus": {
                "connected":  bool(fac.scopus_connected),
                "sync_status": fac.scopus_sync_status,
                "last_sync":  _iso(fac.last_scopus_sync),
                "account_id": fac.scopus_author_id,
            },
        },
        "phone":              fac.phone,
        "dob":                _iso(fac.dob),
        "gender":             fac.gender,
        "nationality":        fac.nationality,
        "employee_id":        fac.employee_id,
        "qualification":      fac.qualification,
        "bio":                fac.bio,
        "biography":          fac.biography,
        "profile_photo_url":  fac.profile_photo_url,
        "current_position":   fac.current_position,
        "office_address":     fac.office_address,
        "institution":        fac.institution,
        "specialization":     fac.specialization,
        "research_interests": fac.research_interests,
        "languages_spoken":   fac.languages_spoken,
        "h_index":            fac.h_index,
        "i10_index":          fac.i10_index,
        "avg_impact_factor":  pub_avg_if,
        "research_score":     fac.research_score,
        "total_publications": len(pubs),
        "total_citations":    pub_citations,
        "education":          education,
        "experience":         experience,
        "achievements":       achievements,
        "certifications":     certifications,
        "research_areas":     research_areas,
        "academic_links":     academic_links,
        "social_links":       social_links,
        "completion":         completion,
    }


def _apply_updates(fac, data: dict):
    for key, value in data.items():
        if key == "dob":
            fac.dob = _to_date(value)
            continue
        if value == "":
            value = None
        setattr(fac, key, value)


@router.put("/personal")
def update_personal(updates: PersonalUpdate, db: Session = Depends(get_db),
                    current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    _apply_updates(fac, updates.dict(exclude_unset=True))
    db.commit()
    db.refresh(fac)
    return {"message": "Personal information updated", "completion": _completion(db, fac)}


@router.put("/professional")
def update_professional(updates: ProfessionalUpdate, db: Session = Depends(get_db),
                        current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    _apply_updates(fac, updates.dict(exclude_unset=True))
    db.commit()
    db.refresh(fac)
    return {"message": "Professional information updated", "completion": _completion(db, fac)}


@router.post("/photo")
def upload_photo(file: UploadFile = File(...), db: Session = Depends(get_db),
                 current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    url = _save_upload(file, PHOTO_EXTENSIONS)
    fac.profile_photo_url = url
    db.commit()
    return {"message": "Photo updated", "profile_photo_url": url}


@router.post("/upload-certificate")
def upload_certificate(file: UploadFile = File(...), current=Depends(get_current_faculty)):
    url = _save_upload(file, CERT_EXTENSIONS)
    return {"certificate_url": url}


# ── Education ────────────────────────────────────────────────────────────────
@router.get("/education")
def get_education(db: Session = Depends(get_db), current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    return [
        {"id": e.education_id, "degree": e.degree, "university": e.university,
         "institute": e.institute, "year": e.year, "percentage": e.percentage,
         "description": e.description}
        for e in db.query(FacultyEducation).filter(FacultyEducation.faculty_id == fac.faculty_id)
        .order_by(FacultyEducation.year.desc()).all()
    ]


@router.post("/education")
def add_education(data: EducationIn, db: Session = Depends(get_db),
                  current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    e = FacultyEducation(faculty_id=fac.faculty_id, degree=data.degree, university=data.university,
                         institute=data.institute, year=data.year, percentage=data.percentage,
                         description=data.description)
    db.add(e)
    db.commit()
    db.refresh(e)
    return {"message": "Education added", "id": e.education_id}


@router.put("/education/{eid}")
def update_education(eid: int, data: EducationUpdate, db: Session = Depends(get_db),
                     current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    e = db.query(FacultyEducation).filter(FacultyEducation.education_id == eid,
                                          FacultyEducation.faculty_id == fac.faculty_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Education not found")
    for k, v in data.dict(exclude_unset=True).items():
        if v == "":
            v = None
        setattr(e, k, v)
    db.commit()
    return {"message": "Education updated"}


@router.delete("/education/{eid}")
def delete_education(eid: int, db: Session = Depends(get_db),
                     current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    e = db.query(FacultyEducation).filter(FacultyEducation.education_id == eid,
                                          FacultyEducation.faculty_id == fac.faculty_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Education not found")
    db.delete(e)
    db.commit()
    return {"message": "Deleted"}


# ── Experience ───────────────────────────────────────────────────────────────
@router.get("/experience")
def get_experience(db: Session = Depends(get_db), current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    return [
        {"id": e.experience_id, "organization": e.organization, "position": e.position,
         "start_date": _iso(e.start_date), "end_date": _iso(e.end_date),
         "is_current": e.is_current, "description": e.description}
        for e in db.query(FacultyExperience).filter(FacultyExperience.faculty_id == fac.faculty_id)
        .order_by(FacultyExperience.is_current.desc()).all()
    ]


@router.post("/experience")
def add_experience(data: ExperienceIn, db: Session = Depends(get_db),
                   current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    e = FacultyExperience(faculty_id=fac.faculty_id, organization=data.organization,
                          position=data.position, start_date=_to_date(data.start_date),
                          end_date=_to_date(data.end_date), is_current=data.is_current,
                          description=data.description)
    db.add(e)
    db.commit()
    db.refresh(e)
    return {"message": "Experience added", "id": e.experience_id}


@router.put("/experience/{eid}")
def update_experience(eid: int, data: ExperienceUpdate, db: Session = Depends(get_db),
                      current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    e = db.query(FacultyExperience).filter(FacultyExperience.experience_id == eid,
                                           FacultyExperience.faculty_id == fac.faculty_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Experience not found")
    for k, v in data.dict(exclude_unset=True).items():
        if k in ("start_date", "end_date"):
            e.__setattr__(k, _to_date(v))
        elif v == "":
            setattr(e, k, None)
        else:
            setattr(e, k, v)
    db.commit()
    return {"message": "Experience updated"}


@router.delete("/experience/{eid}")
def delete_experience(eid: int, db: Session = Depends(get_db),
                      current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    e = db.query(FacultyExperience).filter(FacultyExperience.experience_id == eid,
                                           FacultyExperience.faculty_id == fac.faculty_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Experience not found")
    db.delete(e)
    db.commit()
    return {"message": "Deleted"}


# ── Achievements ─────────────────────────────────────────────────────────────
@router.get("/achievements")
def get_achievements(db: Session = Depends(get_db), current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    return [
        {"id": a.achievement_id, "title": a.title, "category": a.category,
         "issuer": a.issuer, "year": a.year, "amount": a.amount,
         "description": a.description, "achievement_date": _iso(a.achievement_date),
         "certificate_url": a.certificate_url}
        for a in db.query(Achievement).filter(Achievement.faculty_id == fac.faculty_id)
        .order_by(Achievement.year.desc()).all()
    ]


@router.post("/achievements")
def add_achievement(data: AchievementIn, db: Session = Depends(get_db),
                    current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    a = Achievement(faculty_id=fac.faculty_id, title=data.title, category=data.category,
                    issuer=data.issuer, year=data.year, amount=data.amount,
                    description=data.description, achievement_date=_to_date(data.achievement_date),
                    certificate_url=data.certificate_url)
    db.add(a)
    db.commit()
    db.refresh(a)
    return {"message": "Achievement added", "id": a.achievement_id}


@router.put("/achievements/{aid}")
def update_achievement(aid: int, data: AchievementUpdate, db: Session = Depends(get_db),
                       current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    a = db.query(Achievement).filter(Achievement.achievement_id == aid,
                                     Achievement.faculty_id == fac.faculty_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Achievement not found")
    for k, v in data.dict(exclude_unset=True).items():
        if k == "achievement_date":
            a.achievement_date = _to_date(v)
        elif v == "":
            setattr(a, k, None)
        else:
            setattr(a, k, v)
    db.commit()
    return {"message": "Achievement updated"}


@router.delete("/achievements/{aid}")
def delete_achievement(aid: int, db: Session = Depends(get_db),
                       current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    a = db.query(Achievement).filter(Achievement.achievement_id == aid,
                                     Achievement.faculty_id == fac.faculty_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Achievement not found")
    db.delete(a)
    db.commit()
    return {"message": "Deleted"}


# ── Certifications ───────────────────────────────────────────────────────────
@router.get("/certifications")
def get_certifications(db: Session = Depends(get_db), current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    return [
        {"id": c.cert_id, "name": c.name, "issuing_org": c.issuing_org,
         "issue_date": _iso(c.issue_date), "expiry_date": _iso(c.expiry_date),
         "credential_id": c.credential_id, "credential_url": c.credential_url,
         "certificate_url": c.certificate_url}
        for c in db.query(FacultyCertification).filter(FacultyCertification.faculty_id == fac.faculty_id).all()
    ]


@router.post("/certifications")
def add_certification(data: CertificationIn, db: Session = Depends(get_db),
                      current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    c = FacultyCertification(faculty_id=fac.faculty_id, name=data.name, issuing_org=data.issuing_org,
                             issue_date=_to_date(data.issue_date), expiry_date=_to_date(data.expiry_date),
                             credential_id=data.credential_id, credential_url=data.credential_url,
                             certificate_url=data.certificate_url)
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"message": "Certification added", "id": c.cert_id}


@router.put("/certifications/{cid}")
def update_certification(cid: int, data: CertificationUpdate, db: Session = Depends(get_db),
                         current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    c = db.query(FacultyCertification).filter(FacultyCertification.cert_id == cid,
                                              FacultyCertification.faculty_id == fac.faculty_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Certification not found")
    for k, v in data.dict(exclude_unset=True).items():
        if k in ("issue_date", "expiry_date"):
            c.__setattr__(k, _to_date(v))
        elif v == "":
            setattr(c, k, None)
        else:
            setattr(c, k, v)
    db.commit()
    return {"message": "Certification updated"}


@router.delete("/certifications/{cid}")
def delete_certification(cid: int, db: Session = Depends(get_db),
                         current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    c = db.query(FacultyCertification).filter(FacultyCertification.cert_id == cid,
                                              FacultyCertification.faculty_id == fac.faculty_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Certification not found")
    db.delete(c)
    db.commit()
    return {"message": "Deleted"}


# ── Research areas ───────────────────────────────────────────────────────────
@router.post("/research-areas")
def add_research_area(data: ResearchAreaIn, db: Session = Depends(get_db),
                      current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    name = data.area_name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Area name required")
    dup = db.query(FacultyResearchArea).filter(
        FacultyResearchArea.faculty_id == fac.faculty_id,
        or_(FacultyResearchArea.area_name == name,
            FacultyResearchArea.area_name.ilike(name)),
    ).first()
    if dup:
        return {"message": "Already exists", "id": dup.id}
    r = FacultyResearchArea(faculty_id=fac.faculty_id, area_name=name)
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"message": "Research area added", "id": r.id}


@router.put("/research-areas/{rid}")
def update_research_area(rid: int, data: ResearchAreaIn, db: Session = Depends(get_db),
                         current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    r = db.query(FacultyResearchArea).filter(FacultyResearchArea.id == rid,
                                             FacultyResearchArea.faculty_id == fac.faculty_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Research area not found")
    r.area_name = data.area_name.strip()
    db.commit()
    return {"message": "Updated"}


@router.delete("/research-areas/{rid}")
def delete_research_area(rid: int, db: Session = Depends(get_db),
                         current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    r = db.query(FacultyResearchArea).filter(FacultyResearchArea.id == rid,
                                             FacultyResearchArea.faculty_id == fac.faculty_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Research area not found")
    db.delete(r)
    db.commit()
    return {"message": "Deleted"}


# ── Links (dynamic, database-driven) ───────────────────────────────────────
def _valid_url(url: str) -> bool:
    if not url:
        return True
    if len(url) > 500:
        return False
    if not url.startswith(("http://", "https://")):
        return False
    try:
        p = urlparse(url)
        host = (p.hostname or "").lower()
        if not p.scheme or not host:
            return False
        return "." in host or host in ("localhost", "127.0.0.1", "::1")
    except Exception:
        return False


def _norm_name(name: str) -> str:
    return name.strip().lower()


def _dup_link(db, model, faculty_id, name, exclude_id=None):
    q = db.query(model).filter(
        model.faculty_id == faculty_id,
        func.lower(model.platform) == _norm_name(name),
    )
    if exclude_id is not None:
        q = q.filter(model.link_id != exclude_id)
    return q.first()


class LinkCreate(BaseModel):
    platform: str
    url: str = ""


class LinkUpdate(BaseModel):
    platform: Optional[str] = None
    url: Optional[str] = None


def _validate_link_name(name: str):
    name = name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Platform name is required")
    if len(name) > 100:
        raise HTTPException(status_code=400, detail="Platform name is too long (max 100 characters)")
    return name


@router.get("/academic-links")
def get_academic_links(db: Session = Depends(get_db), current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    links = db.query(FacultyAcademicLink).filter(
        FacultyAcademicLink.faculty_id == fac.faculty_id
    ).order_by(FacultyAcademicLink.link_id.asc()).all()
    return [
        {"id": l.link_id, "platform": l.platform, "url": l.url,
         "is_connected": l.is_connected}
        for l in links
    ]


@router.post("/academic-links")
def add_academic_link(data: LinkCreate, db: Session = Depends(get_db),
                      current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    name = _validate_link_name(data.platform)
    if not _valid_url(data.url):
        raise HTTPException(status_code=400, detail="Invalid URL. Use a valid http(s) link.")
    if _dup_link(db, FacultyAcademicLink, fac.faculty_id, name):
        raise HTTPException(status_code=400, detail=f"Link for '{name}' already exists")
    url = data.url.strip()
    link = FacultyAcademicLink(faculty_id=fac.faculty_id, platform=name,
                               url=url, is_connected=bool(url))
    db.add(link)
    db.commit()
    db.refresh(link)
    return {"message": "Link added", "id": link.link_id}


@router.put("/academic-links/{link_id}")
def update_academic_link(link_id: int, data: LinkUpdate, db: Session = Depends(get_db),
                         current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    link = db.query(FacultyAcademicLink).filter(
        FacultyAcademicLink.link_id == link_id,
        FacultyAcademicLink.faculty_id == fac.faculty_id,
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    if data.platform is not None:
        name = _validate_link_name(data.platform)
        if _dup_link(db, FacultyAcademicLink, fac.faculty_id, name, exclude_id=link_id):
            raise HTTPException(status_code=400, detail=f"Link for '{name}' already exists")
        link.platform = name
    if data.url is not None:
        if not _valid_url(data.url):
            raise HTTPException(status_code=400, detail="Invalid URL. Use a valid http(s) link.")
        link.url = data.url.strip()
        link.is_connected = bool(link.url)
    db.commit()
    return {"message": "Link updated", "id": link.link_id}


@router.delete("/academic-links/{link_id}")
def delete_academic_link(link_id: int, db: Session = Depends(get_db),
                         current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    link = db.query(FacultyAcademicLink).filter(
        FacultyAcademicLink.link_id == link_id,
        FacultyAcademicLink.faculty_id == fac.faculty_id,
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    db.delete(link)
    db.commit()
    return {"message": "Removed"}


class VerifyRequest(BaseModel):
    platform: str
    account_id: str = ""


@router.post("/verify-connection")
def verify_platform_connection(data: VerifyRequest,
                               db: Session = Depends(get_db),
                               current=Depends(get_current_faculty)):
    """Probe a research platform for the given account id and report live status."""
    fac = _get_faculty(db, current)
    platform = (data.platform or "").strip().lower()
    account_id = (data.account_id or "").strip()

    from app.providers import get_provider, ProviderError
    try:
        provider = get_provider(platform)
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform}")

    if not provider.validate_id(account_id):
        return {
            "platform": platform,
            "account_id": account_id,
            "valid": False,
            "connected": False,
            "message": f"'{account_id}' is not a valid {platform} identifier.",
            "records_found": 0,
        }

    # A full fetch is the most accurate connectivity check (also updates counts).
    try:
        result = provider.fetch(account_id)
        connected = True
        message = f"Connection verified — {result.total_fetched} work(s) found."
    except ProviderError as e:
        connected = False
        message = str(e)
        result = None
    except Exception as e:
        connected = False
        message = f"Could not reach {platform}: {e}"

    # Persist connection state on the faculty record
    connected_attr = f"{platform}_connected"
    status_attr = f"{platform}_sync_status"
    if platform in ("google_scholar", "orcid", "scopus"):
        if connected:
            setattr(fac, connected_attr, True)
            setattr(fac, status_attr, "done")
        else:
            setattr(fac, connected_attr, False)
            setattr(fac, status_attr, "error")
        db.commit()

    return {
        "platform": platform,
        "account_id": account_id,
        "valid": True,
        "connected": connected,
        "message": message,
        "records_found": result.total_fetched if result else 0,
    }


# ── Social links (dynamic, database-driven) ─────────────────────────────────
@router.get("/social-links")
def get_social_links(db: Session = Depends(get_db), current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    links = db.query(FacultySocialLink).filter(
        FacultySocialLink.faculty_id == fac.faculty_id
    ).order_by(FacultySocialLink.link_id.asc()).all()
    return [
        {"id": l.link_id, "platform": l.platform, "url": l.url}
        for l in links
    ]


@router.post("/social-links")
def add_social_link(data: LinkCreate, db: Session = Depends(get_db),
                    current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    name = _validate_link_name(data.platform)
    if not _valid_url(data.url):
        raise HTTPException(status_code=400, detail="Invalid URL. Use a valid http(s) link.")
    if _dup_link(db, FacultySocialLink, fac.faculty_id, name):
        raise HTTPException(status_code=400, detail=f"Link for '{name}' already exists")
    link = FacultySocialLink(faculty_id=fac.faculty_id, platform=name,
                             url=data.url.strip())
    db.add(link)
    db.commit()
    db.refresh(link)
    return {"message": "Link added", "id": link.link_id}


@router.put("/social-links/{link_id}")
def update_social_link(link_id: int, data: LinkUpdate, db: Session = Depends(get_db),
                       current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    link = db.query(FacultySocialLink).filter(
        FacultySocialLink.link_id == link_id,
        FacultySocialLink.faculty_id == fac.faculty_id,
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    if data.platform is not None:
        name = _validate_link_name(data.platform)
        if _dup_link(db, FacultySocialLink, fac.faculty_id, name, exclude_id=link_id):
            raise HTTPException(status_code=400, detail=f"Link for '{name}' already exists")
        link.platform = name
    if data.url is not None:
        if not _valid_url(data.url):
            raise HTTPException(status_code=400, detail="Invalid URL. Use a valid http(s) link.")
        link.url = data.url.strip()
    db.commit()
    return {"message": "Link updated", "id": link.link_id}


@router.delete("/social-links/{link_id}")
def delete_social_link(link_id: int, db: Session = Depends(get_db),
                       current=Depends(get_current_faculty)):
    fac = _get_faculty(db, current)
    link = db.query(FacultySocialLink).filter(
        FacultySocialLink.link_id == link_id,
        FacultySocialLink.faculty_id == fac.faculty_id,
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    db.delete(link)
    db.commit()
    return {"message": "Removed"}
