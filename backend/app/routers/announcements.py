from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Session, relationship
from sqlalchemy.sql import func
from app.database import get_db, Base
from app.dependencies import get_current_faculty
from app.models import Faculty, Department, School
from app.routers.admin import Admin
from app.security import decode_token
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import json
import os
import shutil
import uuid
import queue
import threading
import asyncio

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "announcements")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf",".doc",".docx",".xls",".xlsx",".ppt",".pptx",".txt",".csv",
                      ".jpg",".jpeg",".png",".gif",".zip",".rar",".7z",".mp4",".mp3",".pptx"}
MAX_FILE_SIZE = 25 * 1024 * 1024

# ── Models ──────────────────────────────────────────────────────────────────
class Announcement(Base):
    __tablename__ = "announcements_v2"
    announcement_id = Column(Integer, primary_key=True)
    created_by      = Column(Integer, ForeignKey("faculty.faculty_id"), nullable=True)
    created_by_admin_id = Column(Integer, nullable=True)
    updated_by      = Column(Integer, nullable=True)
    title           = Column(String(300))
    summary         = Column(String(500), default="")
    description     = Column(Text, default="")
    category        = Column(String(50), default="General Announcement")
    priority        = Column(String(20), default="medium")
    status          = Column(String(20), default="published")
    pinned          = Column(Boolean, default=False)
    target_type     = Column(String(30), default="everyone")
    target_school_id = Column(Integer, nullable=True)
    target_dept_id  = Column(Integer, nullable=True)
    target_role     = Column(String(30), default="all")
    target_roles        = Column(JSON, nullable=True)
    target_school_ids   = Column(JSON, nullable=True)
    target_dept_ids     = Column(JSON, nullable=True)
    publish_at      = Column(DateTime, nullable=True)
    published_at    = Column(DateTime, nullable=True)
    expires_at      = Column(DateTime, nullable=True)
    registration_link  = Column(String(500), default="")
    meeting_link       = Column(String(500), default="")
    google_form_link   = Column(String(500), default="")
    conference_url     = Column(String(500), default="")
    read_count      = Column(Integer, default=0)
    delivery_count  = Column(Integer, default=0)
    attachment_count = Column(Integer, default=0)
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())

class AnnouncementRead(Base):
    __tablename__ = "announcement_reads"
    read_id         = Column(Integer, primary_key=True)
    announcement_id = Column(Integer, ForeignKey("announcements_v2.announcement_id"))
    faculty_id      = Column(Integer, ForeignKey("faculty.faculty_id"), nullable=True)
    admin_id        = Column(Integer, nullable=True)
    read_at         = Column(DateTime, server_default=func.now())

class AnnouncementNotification(Base):
    __tablename__ = "announcement_notifications"
    notification_id = Column(Integer, primary_key=True)
    announcement_id = Column(Integer, ForeignKey("announcements_v2.announcement_id"), index=True)
    faculty_id      = Column(Integer, nullable=True, index=True)
    admin_id        = Column(Integer, nullable=True, index=True)
    is_read         = Column(Boolean, default=False)
    read_at         = Column(DateTime, nullable=True)
    delivered_at    = Column(DateTime, server_default=func.now())

class AnnouncementAttachment(Base):
    __tablename__ = "announcement_attachments"
    attachment_id   = Column(Integer, primary_key=True)
    announcement_id = Column(Integer, ForeignKey("announcements_v2.announcement_id"))
    filename        = Column(String(500))
    stored_name     = Column(String(500))
    file_size       = Column(Integer, default=0)
    content_type    = Column(String(200), default="")
    uploaded_by     = Column(Integer, ForeignKey("faculty.faculty_id"), nullable=True)
    created_at      = Column(DateTime, server_default=func.now())

# ── Schemas ─────────────────────────────────────────────────────────────────
class AnnouncementCreate(BaseModel):
    title: str
    summary: str = ""
    description: str = ""
    category: str = "General Announcement"
    priority: str = "medium"
    status: str = "published"
    pinned: bool = False
    target_type: str = "everyone"
    target_school_id: Optional[int] = None
    target_dept_id: Optional[int] = None
    target_role: str = "all"
    target_roles: Optional[List[str]] = None
    target_school_ids: Optional[List[int]] = None
    target_dept_ids: Optional[List[int]] = None
    publish_at: Optional[str] = None
    expires_at: Optional[str] = None
    registration_link: str = ""
    meeting_link: str = ""
    google_form_link: str = ""
    conference_url: str = ""

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    pinned: Optional[bool] = None
    target_type: Optional[str] = None
    target_school_id: Optional[int] = None
    target_dept_id: Optional[int] = None
    target_role: Optional[str] = None
    target_roles: Optional[List[str]] = None
    target_school_ids: Optional[List[int]] = None
    target_dept_ids: Optional[List[int]] = None
    publish_at: Optional[str] = None
    expires_at: Optional[str] = None
    registration_link: Optional[str] = None
    meeting_link: Optional[str] = None
    google_form_link: Optional[str] = None
    conference_url: Optional[str] = None

CATEGORIES = [
    "Research Funding","Conference","Journal","Patent / IPR","Workshop","Seminar",
    "FDP","Research Grant","Faculty Meeting","Administrative Notice","Academic Notice",
    "Student Research","Deadline","Awards & Achievements","General Announcement",
]
PRIORITIES = ["critical","high","medium","low"]
STATUSES = ["draft","scheduled","published","expired","archived"]
AUDIENCE_ROLES = ["everyone","admin","dean_rd","hod","faculty","students"]
ROLE_LABELS = {"admin":"Admin","dean_rd":"Dean","hod":"HOD","faculty":"Faculty","students":"Students","everyone":"Everyone"}

CATEGORY_COLORS = {
    "Research Funding":"#085041","Conference":"#0C447C","Journal":"#534AB7",
    "Patent / IPR":"#633806","Workshop":"#A32D2D","Seminar":"#1A6B4A",
    "FDP":"#5B3DF5","Research Grant":"#27500A","Faculty Meeting":"#791F1F",
    "Administrative Notice":"#333","Academic Notice":"#555","Student Research":"#0C447C",
    "Deadline":"#A32D2D","Awards & Achievements":"#633806","General Announcement":"#666",
}
PRIORITY_COLORS = {"critical":"#A32D2D","high":"#D97706","medium":"#0C447C","low":"#22A853"}
STATUS_COLORS = {"draft":"#888","scheduled":"#D97706","published":"#22A853","expired":"#A32D2D","archived":"#999"}
STATUS_RANK = {"published":0,"scheduled":1,"expired":2,"draft":3,"archived":4}

# ── Time helpers (all times stored/compared in UTC) ─────────────────────────
def _now_utc():
    return datetime.utcnow()

def _parse_dt(s):
    if not s:
        return None
    s = s.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        d = datetime.fromisoformat(s)
    except ValueError:
        return None
    if d.tzinfo is not None:
        d = d.astimezone(timezone.utc).replace(tzinfo=None)
    return d

def _iso(d):
    return d.isoformat() if d else None

def _effective_status(a, now=None):
    now = now or _now_utc()
    if a.status == "draft":
        return "draft"
    if a.status == "archived":
        return "archived"
    if a.publish_at and now < a.publish_at:
        return "scheduled"
    if a.expires_at and now >= a.expires_at:
        return "expired"
    return "published"

# ── Audience / targeting helpers ─────────────────────────────────────────────
def _targets(a):
    """Return (roles, school_ids, dept_ids) for an announcement, with legacy fallback."""
    roles   = list(a.target_roles or [])
    schools = list(a.target_school_ids or [])
    depts   = list(a.target_dept_ids or [])
    if roles or schools or depts:
        return roles, schools, depts
    if a.target_type == "everyone":
        return ["everyone"], [], []
    roles = []
    if a.target_role and a.target_role not in ("all", ""):
        roles = [a.target_role]
    else:
        roles = ["everyone"]
    schools = [a.target_school_id] if a.target_school_id else []
    depts   = [a.target_dept_id] if a.target_dept_id else []
    return roles, schools, depts

def _resolve_user(db, current):
    """Enrich JWT payload with authoritative DB school/dept/role values."""
    info = dict(current)
    if current.get("type") == "admin":
        info["dept_id"] = None
        info["school_id"] = None
        return info
    fac = db.query(Faculty).filter(Faculty.faculty_id == current.get("faculty_id")).first()
    if fac:
        dept_id = fac.dept_id
        school_id = fac.school_id
        if not school_id and dept_id:
            d = db.query(Department).filter(Department.dept_id == dept_id).first()
            school_id = d.school_id if d else None
        info.update({
            "dept_id": dept_id, "school_id": school_id,
            "role": fac.role, "name": fac.name, "email": fac.email,
            "designation": fac.designation,
        })
    return info

def can_manage(user):
    return user.get("role") in ["dean_rd", "hod"] or user.get("type") == "admin"

def _user_in_scope(a, user):
    roles, schools, depts = _targets(a)
    role = user.get("role")
    if "everyone" in roles or role in roles:
        pass
    else:
        return False
    if schools:
        if user.get("school_id") not in schools:
            return False
    if depts:
        if user.get("dept_id") not in depts:
            return False
    return True

def _visible(a, user, now=None):
    now = now or _now_utc()
    if user.get("type") == "admin":
        return True
    if a.created_by and a.created_by == user.get("faculty_id"):
        return True
    eff = _effective_status(a, now)
    if eff in ("draft", "archived", "scheduled"):
        return False
    return _user_in_scope(a, user)

def _normalize_targets(db, user, roles, schools, depts):
    """Apply RBAC scoping to requested audience targets."""
    roles = list(roles or [])
    schools = list(schools or [])
    depts = list(depts or [])
    if "everyone" in roles:
        roles, schools, depts = ["everyone"], [], []
    if not roles:
        roles = ["everyone"]
    for r in roles:
        if r not in AUDIENCE_ROLES:
            raise HTTPException(status_code=400, detail=f"Invalid audience role '{r}'")
    if user.get("type") == "admin":
        return roles, schools, depts
    if user.get("role") == "dean_rd":
        my_school = user.get("school_id")
        if not schools:
            schools = [my_school] if my_school else []
        if my_school and any(s != my_school for s in schools):
            raise HTTPException(status_code=403, detail="Dean can only target their own school")
        if depts:
            my_dept_ids = {d.dept_id for d in db.query(Department).filter(Department.school_id == my_school).all()}
            if any(d not in my_dept_ids for d in depts):
                raise HTTPException(status_code=403, detail="Department outside your school scope")
    elif user.get("role") == "hod":
        my_dept = user.get("dept_id")
        if not depts:
            depts = [my_dept] if my_dept else []
        if my_dept and any(d != my_dept for d in depts):
            raise HTTPException(status_code=403, detail="HOD can only target their own department")
        if schools:
            my_school = user.get("school_id")
            if my_school and any(s != my_school for s in schools):
                raise HTTPException(status_code=403, detail="HOD can only target their own school")
    return roles, schools, depts

# ── Delivery / notifications ─────────────────────────────────────────────────
def _eligible_ids(db, a):
    roles, schools, depts = _targets(a)
    fac_ids = []
    admin_ids = []
    if "everyone" in roles or "admin" in roles:
        admin_ids = [ad.admin_id for ad in db.query(Admin).filter(Admin.is_active == True).all()]
    fac_roles = [r for r in roles if r in ("dean_rd", "hod", "faculty")]
    if "everyone" in roles:
        fac_roles = ["dean_rd", "hod", "faculty"]
    if fac_roles:
        facs = db.query(Faculty).filter(Faculty.role.in_(fac_roles), Faculty.is_active == True).all()
        if schools:
            dept_school = {d.dept_id: d.school_id for d in db.query(Department).filter(Department.school_id.in_(schools)).all()}
            for f in facs:
                sch = f.school_id if f.school_id else dept_school.get(f.dept_id)
                if sch in schools and (not depts or f.dept_id in depts):
                    fac_ids.append(f.faculty_id)
        else:
            for f in facs:
                if not depts or f.dept_id in depts:
                    fac_ids.append(f.faculty_id)
    return fac_ids, admin_ids

def _deliver(db, a):
    db.query(AnnouncementNotification).filter(
        AnnouncementNotification.announcement_id == a.announcement_id
    ).delete(synchronize_session=False)
    fac_ids, admin_ids = _eligible_ids(db, a)
    if a.created_by:
        fac_ids = [fid for fid in fac_ids if fid != a.created_by]
    if a.created_by_admin_id:
        admin_ids = [aid for aid in admin_ids if aid != a.created_by_admin_id]
    for fid in fac_ids:
        db.add(AnnouncementNotification(announcement_id=a.announcement_id, faculty_id=fid))
    for aid in admin_ids:
        db.add(AnnouncementNotification(announcement_id=a.announcement_id, admin_id=aid))
    a.delivery_count = len(fac_ids) + len(admin_ids)
    db.commit()

def _ensure_notifications(db, user):
    """Idempotent per-user delivery (backfills legacy announcements)."""
    now = _now_utc()
    if user.get("type") == "admin":
        admin_id = user.get("admin_id")
        anns = db.query(Announcement).filter(Announcement.status == "published").all()
        for a in anns:
            roles, schools, depts = _targets(a)
            if "everyone" not in roles and "admin" not in roles:
                continue
            existing = db.query(AnnouncementNotification).filter(
                AnnouncementNotification.announcement_id == a.announcement_id,
                AnnouncementNotification.admin_id == admin_id,
            ).first()
            if not existing:
                db.add(AnnouncementNotification(announcement_id=a.announcement_id, admin_id=admin_id))
                a.delivery_count = (a.delivery_count or 0) + 1
        db.commit()
        return
    fac_id = user.get("faculty_id")
    role = user.get("role")
    dept_id = user.get("dept_id")
    school_id = user.get("school_id")
    anns = db.query(Announcement).filter(Announcement.status == "published").all()
    for a in anns:
        if a.created_by == fac_id:
            continue
        roles, schools, depts = _targets(a)
        if "everyone" not in roles and role not in roles:
            continue
        if schools and school_id not in schools:
            continue
        if depts and dept_id not in depts:
            continue
        existing = db.query(AnnouncementNotification).filter(
            AnnouncementNotification.announcement_id == a.announcement_id,
            AnnouncementNotification.faculty_id == fac_id,
        ).first()
        if not existing:
            db.add(AnnouncementNotification(announcement_id=a.announcement_id, faculty_id=fac_id))
            a.delivery_count = (a.delivery_count or 0) + 1
    db.commit()

def _notif_query(db, user):
    if user.get("type") == "admin":
        return db.query(AnnouncementNotification).filter(
            AnnouncementNotification.admin_id == user.get("admin_id"))
    return db.query(AnnouncementNotification).filter(
        AnnouncementNotification.faculty_id == user.get("faculty_id"))

def _unread_count(db, user):
    q = _notif_query(db, user).filter(AnnouncementNotification.is_read == False)
    return q.join(Announcement, Announcement.announcement_id == AnnouncementNotification.announcement_id)\
             .filter(Announcement.status == "published").count()

def _read_count_map(db, ids):
    if not ids:
        return {}
    rows = db.query(
        AnnouncementNotification.announcement_id,
        func.count(AnnouncementNotification.notification_id),
    ).filter(
        AnnouncementNotification.announcement_id.in_(ids),
        AnnouncementNotification.is_read == True,
    ).group_by(AnnouncementNotification.announcement_id).all()
    return {r[0]: r[1] for r in rows}

# ── Serialization ─────────────────────────────────────────────────────────────
def _creator_info(db, a, faculty_cache=None):
    if a.created_by:
        if faculty_cache is not None:
            return faculty_cache.get(a.created_by)
        f = db.query(Faculty).filter(Faculty.faculty_id == a.created_by).first()
        if f:
            return {"faculty_id": f.faculty_id, "name": f.name, "email": f.email,
                    "designation": f.designation, "role": f.role, "type": "faculty"}
    if a.created_by_admin_id:
        ad = db.query(Admin).filter(Admin.admin_id == a.created_by_admin_id).first()
        if ad:
            return {"faculty_id": None, "name": ad.username or ad.email, "email": ad.email,
                    "designation": "Administrator", "role": "admin", "type": "admin"}
    return None

def _updated_by_info(db, a):
    if not a.updated_by:
        return None
    if a.updated_by < 0:
        ad = db.query(Admin).filter(Admin.admin_id == -a.updated_by).first()
        if ad:
            return {"name": ad.username or ad.email, "role": "admin"}
        return None
    f = db.query(Faculty).filter(Faculty.faculty_id == a.updated_by).first()
    if f:
        return {"name": f.name, "role": f.role}
    return None

def serialize_ann(a, db, faculty_cache=None, include_attachments=True, read_count=None):
    creator = _creator_info(db, a, faculty_cache)
    attachments = []
    if include_attachments:
        atts = db.query(AnnouncementAttachment).filter(
            AnnouncementAttachment.announcement_id == a.announcement_id
        ).order_by(AnnouncementAttachment.created_at.desc()).all()
        attachments = [{
            "attachment_id": t.attachment_id,
            "filename": t.filename,
            "file_size": t.file_size or 0,
            "content_type": t.content_type or "",
            "created_at": _iso(t.created_at),
        } for t in atts]
    delivery_count = a.delivery_count or 0
    rc = read_count
    if rc is None:
        rc = db.query(func.count(AnnouncementNotification.notification_id)).filter(
            AnnouncementNotification.announcement_id == a.announcement_id,
            AnnouncementNotification.is_read == True,
        ).scalar() or 0
    return {
        "announcement_id": a.announcement_id,
        "title": a.title,
        "summary": a.summary or "",
        "description": a.description or "",
        "category": a.category or "General Announcement",
        "priority": a.priority or "medium",
        "status": _effective_status(a),
        "pinned": a.pinned or False,
        "target_type": a.target_type or "everyone",
        "target_school_id": a.target_school_id,
        "target_dept_id": a.target_dept_id,
        "target_role": a.target_role or "all",
        "target_roles": a.target_roles or [],
        "target_school_ids": a.target_school_ids or [],
        "target_dept_ids": a.target_dept_ids or [],
        "publish_at": _iso(a.publish_at),
        "published_at": _iso(a.published_at),
        "expires_at": _iso(a.expires_at),
        "registration_link": a.registration_link or "",
        "meeting_link": a.meeting_link or "",
        "google_form_link": a.google_form_link or "",
        "conference_url": a.conference_url or "",
        "delivery_count": delivery_count,
        "read_count": rc,
        "unread_count": max(0, delivery_count - rc),
        "attachment_count": len(attachments),
        "attachments": attachments,
        "created_by": creator,
        "updated_by": _updated_by_info(db, a),
        "created_at": _iso(a.created_at),
        "updated_at": _iso(a.updated_at),
    }

# ── Auto status transitions + delivery ───────────────────────────────────────
def _auto_status(db):
    now = _now_utc()
    to_publish = db.query(Announcement).filter(
        Announcement.status == "scheduled",
        Announcement.publish_at.isnot(None),
        Announcement.publish_at <= now,
    ).all()
    for a in to_publish:
        a.status = "published"
        if not a.published_at:
            a.published_at = now
    db.query(Announcement).filter(
        Announcement.status == "published",
        Announcement.expires_at.isnot(None),
        Announcement.expires_at <= now,
    ).update({"status": "expired"}, synchronize_session=False)
    if to_publish:
        db.commit()
        for a in to_publish:
            _deliver(db, a)
        _broadcast("announcement", {"status": "published"})
    else:
        db.commit()

# ── Real-time broadcast (in-process, single uvicorn worker) ─────────────────
_subs = set()
_subs_lock = threading.Lock()

def _broadcast(event, data):
    payload = f"event: {event}\ndata: {json.dumps(data)}\n\n"
    with _subs_lock:
        for q in list(_subs):
            try:
                q.put_nowait(payload)
            except Exception:
                _subs.discard(q)

# ── Endpoints (static routes declared BEFORE /{announcement_id}) ─────────────
@router.get("/categories")
def get_categories():
    return {c: CATEGORY_COLORS.get(c, "#666") for c in CATEGORIES}

@router.get("/options")
def get_options(db: Session = Depends(get_db), current=Depends(get_current_faculty)):
    user = _resolve_user(db, current)
    if user.get("type") == "admin":
        schools = db.query(School).order_by(School.school_name).all()
        depts = db.query(Department).order_by(Department.dept_name).all()
    elif user.get("role") == "dean_rd":
        sid = user.get("school_id")
        schools = db.query(School).filter(School.school_id == sid).all() if sid else []
        depts = db.query(Department).filter(Department.school_id == sid).order_by(Department.dept_name).all() if sid else []
    elif user.get("role") == "hod":
        sid = user.get("school_id")
        did = user.get("dept_id")
        schools = db.query(School).filter(School.school_id == sid).all() if sid else []
        depts = db.query(Department).filter(Department.dept_id == did).all() if did else []
    else:
        schools, depts = [], []
    return {
        "roles": AUDIENCE_ROLES,
        "role_labels": ROLE_LABELS,
        "schools": [{"school_id": s.school_id, "school_name": s.school_name} for s in schools],
        "departments": [{"dept_id": d.dept_id, "dept_code": d.dept_code, "dept_name": d.dept_name, "school_id": d.school_id} for d in depts],
        "categories": CATEGORIES,
        "priorities": PRIORITIES,
    }

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current=Depends(get_current_faculty)):
    _auto_status(db)
    base = db.query(Announcement)
    total = base.count()
    published = base.filter(Announcement.status == "published").count()
    drafts = base.filter(Announcement.status == "draft").count()
    scheduled = base.filter(Announcement.status == "scheduled").count()
    expired = base.filter(Announcement.status == "expired").count()
    high_priority = base.filter(Announcement.priority.in_(["critical", "high"]), Announcement.status == "published").count()
    return {"total": total, "published": published, "drafts": drafts,
            "scheduled": scheduled, "expired": expired, "high_priority": high_priority}

@router.get("/notifications")
def get_notifications(db: Session = Depends(get_db), current=Depends(get_current_faculty)):
    user = _resolve_user(db, current)
    _auto_status(db)
    _ensure_notifications(db, user)
    q = db.query(AnnouncementNotification, Announcement).join(
        Announcement, Announcement.announcement_id == AnnouncementNotification.announcement_id
    ).filter(Announcement.status == "published")
    if user.get("type") == "admin":
        q = q.filter(AnnouncementNotification.admin_id == user.get("admin_id"))
    else:
        q = q.filter(AnnouncementNotification.faculty_id == user.get("faculty_id"))
    rows = q.order_by(Announcement.pinned.desc(), AnnouncementNotification.delivered_at.desc()).limit(50).all()
    fac_ids = list({a.created_by for _, a in rows if a.created_by})
    facs = db.query(Faculty).filter(Faculty.faculty_id.in_(fac_ids)).all() if fac_ids else []
    faculty_cache = {f.faculty_id: {"faculty_id": f.faculty_id, "name": f.name, "email": f.email,
                                    "designation": f.designation, "role": f.role, "type": "faculty"} for f in facs}
    result = []
    for n, a in rows:
        creator = _creator_info(db, a, faculty_cache)
        result.append({
            "notification_id": n.notification_id,
            "announcement_id": a.announcement_id,
            "is_read": bool(n.is_read),
            "delivered_at": _iso(n.delivered_at),
            "created_at": _iso(a.created_at),
            "title": a.title,
            "summary": a.summary or "",
            "category": a.category or "General Announcement",
            "priority": a.priority or "medium",
            "pinned": a.pinned or False,
            "created_by_name": creator["name"] if creator else "Administrator",
            "created_by_role": creator["role"] if creator else "admin",
        })
    return result

@router.get("/stream")
async def announce_stream(token: str = ""):
    payload = decode_token(token) if token else None
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    q = queue.Queue()
    with _subs_lock:
        _subs.add(q)

    async def gen():
        try:
            while True:
                try:
                    msg = await asyncio.to_thread(q.get, timeout=25)
                    yield msg
                except queue.Empty:
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            with _subs_lock:
                _subs.discard(q)
            raise

    return StreamingResponse(gen(), media_type="text/event-stream")

@router.get("/unread/count")
def unread_count(db: Session = Depends(get_db), current=Depends(get_current_faculty)):
    user = _resolve_user(db, current)
    _auto_status(db)
    _ensure_notifications(db, user)
    unread = _unread_count(db, user)
    q = db.query(AnnouncementNotification).join(
        Announcement, Announcement.announcement_id == AnnouncementNotification.announcement_id
    ).filter(Announcement.status == "published")
    if user.get("type") == "admin":
        q = q.filter(AnnouncementNotification.admin_id == user.get("admin_id"))
    else:
        q = q.filter(AnnouncementNotification.faculty_id == user.get("faculty_id"))
    return {"unread": unread, "total": q.count()}

@router.post("/read-all")
def mark_all_read(db: Session = Depends(get_db), current=Depends(get_current_faculty)):
    user = _resolve_user(db, current)
    _auto_status(db)
    _ensure_notifications(db, user)
    q = _notif_query(db, user).filter(AnnouncementNotification.is_read == False).join(
        Announcement, Announcement.announcement_id == AnnouncementNotification.announcement_id
    ).filter(Announcement.status == "published")
    rows = q.all()
    now = _now_utc()
    for r in rows:
        r.is_read = True
        r.read_at = now
        db.add(AnnouncementRead(announcement_id=r.announcement_id,
                                faculty_id=r.faculty_id, admin_id=r.admin_id, read_at=now))
    db.commit()
    _broadcast("read", {})
    return {"message": "All marked as read", "marked": len(rows), "unread": 0}

@router.get("/attachments/{attachment_id}/download")
def download_attachment(attachment_id: int, db: Session = Depends(get_db),
                        current=Depends(get_current_faculty)):
    user = _resolve_user(db, current)
    att = db.query(AnnouncementAttachment).filter(
        AnnouncementAttachment.attachment_id == attachment_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Not found")
    a = db.query(Announcement).filter(
        Announcement.announcement_id == att.announcement_id).first()
    if a and not _visible(a, user):
        raise HTTPException(status_code=403, detail="Permission denied")
    path = os.path.join(UPLOAD_DIR, att.stored_name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, filename=att.filename, media_type=att.content_type or "application/octet-stream")

@router.get("/")
def get_announcements(
    search: str = "", category: str = "", priority: str = "",
    status: str = "", role: str = "", school_id: str = "",
    dept_id: str = "", date_from: str = "", date_to: str = "",
    db: Session = Depends(get_db), current=Depends(get_current_faculty)
):
    user = _resolve_user(db, current)
    _auto_status(db)
    _ensure_notifications(db, user)

    q = db.query(Announcement)
    if user.get("type") != "admin":
        created_by_me = Announcement.created_by == user.get("faculty_id")
        q = q.filter((Announcement.status.in_(["published", "scheduled", "expired"])) | created_by_me)
    if search:
        like = f"%{search}%"
        q = q.filter(Announcement.title.like(like) | Announcement.summary.like(like))
    if category:
        q = q.filter(Announcement.category == category)
    if priority:
        q = q.filter(Announcement.priority == priority)
    if date_from:
        fd = _parse_dt(date_from)
        if fd:
            q = q.filter(Announcement.created_at >= fd)
    if date_to:
        td = _parse_dt(date_to)
        if td:
            q = q.filter(Announcement.created_at <= td)
    items = q.all()

    now = _now_utc()
    filtered = []
    for a in items:
        if not _visible(a, user, now):
            continue
        if status and _effective_status(a, now) != status:
            continue
        if role:
            roles, schools, depts = _targets(a)
            if role != "everyone" and role not in roles and "everyone" not in roles:
                continue
            if role == "everyone" and "everyone" not in roles:
                continue
        if school_id:
            roles, schools, depts = _targets(a)
            if int(school_id) not in schools:
                continue
        if dept_id:
            roles, schools, depts = _targets(a)
            if int(dept_id) not in depts:
                continue
        filtered.append(a)

    filtered.sort(key=lambda a: (
        not (a.pinned or False),
        STATUS_RANK.get(_effective_status(a, now), 4),
        -(a.created_at.timestamp() if a.created_at else 0),
    ))

    fac_ids = list(set(a.created_by for a in filtered if a.created_by))
    facs = db.query(Faculty).filter(Faculty.faculty_id.in_(fac_ids)).all() if fac_ids else []
    faculty_cache = {f.faculty_id: {"faculty_id": f.faculty_id, "name": f.name, "email": f.email,
                                    "designation": f.designation, "role": f.role, "type": "faculty"} for f in facs}
    read_counts = _read_count_map(db, [a.announcement_id for a in filtered])

    return [serialize_ann(a, db, faculty_cache, read_count=read_counts.get(a.announcement_id, 0)) for a in filtered]

@router.get("/{announcement_id}")
def get_announcement(announcement_id: int, db: Session = Depends(get_db),
                     current=Depends(get_current_faculty)):
    user = _resolve_user(db, current)
    _auto_status(db)
    a = db.query(Announcement).filter(Announcement.announcement_id == announcement_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    if not _visible(a, user):
        raise HTTPException(status_code=404, detail="Not found")
    return serialize_ann(a, db)

@router.post("/")
def create_announcement(data: AnnouncementCreate, db: Session = Depends(get_db),
                        current=Depends(get_current_faculty)):
    user = _resolve_user(db, current)
    if not can_manage(user):
        raise HTTPException(status_code=403, detail="Permission denied")

    roles, schools, depts = _normalize_targets(db, user, data.target_roles, data.target_school_ids, data.target_dept_ids)
    publish_dt = _parse_dt(data.publish_at)
    expires_dt = _parse_dt(data.expires_at)
    if expires_dt and publish_dt and expires_dt <= publish_dt:
        raise HTTPException(status_code=400, detail="Expiry time must be after publish time")

    now = _now_utc()
    eff_status = data.status if data.status in STATUSES else "published"
    if eff_status == "published" and publish_dt and publish_dt > now:
        eff_status = "scheduled"
    if eff_status == "scheduled" and not publish_dt:
        eff_status = "published"

    a = Announcement(
        created_by=user.get("faculty_id"),
        created_by_admin_id=user.get("admin_id"),
        updated_by=user.get("faculty_id") or -(user.get("admin_id") or 0),
        title=data.title,
        summary=data.summary,
        description=data.description,
        category=data.category,
        priority=data.priority,
        status=eff_status,
        pinned=data.pinned,
        target_type="custom",
        target_school_id=None,
        target_dept_id=None,
        target_role="all",
        target_roles=roles,
        target_school_ids=schools,
        target_dept_ids=depts,
        publish_at=publish_dt,
        published_at=now if eff_status == "published" else None,
        expires_at=expires_dt,
        registration_link=data.registration_link,
        meeting_link=data.meeting_link,
        google_form_link=data.google_form_link,
        conference_url=data.conference_url,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    if eff_status == "published":
        _deliver(db, a)
        _broadcast("announcement", {"announcement_id": a.announcement_id, "title": a.title})
    return serialize_ann(a, db)

@router.put("/{announcement_id}")
def update_announcement(announcement_id: int, data: AnnouncementUpdate,
                        db: Session = Depends(get_db),
                        current=Depends(get_current_faculty)):
    user = _resolve_user(db, current)
    if not can_manage(user):
        raise HTTPException(status_code=403, detail="Permission denied")
    a = db.query(Announcement).filter(Announcement.announcement_id == announcement_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    if user.get("type") != "admin" and a.created_by != user.get("faculty_id"):
        raise HTTPException(status_code=403, detail="You can only edit announcements you created")

    updates = data.dict(exclude_unset=True)

    # Re-normalize audience targets under RBAC if provided
    if "target_roles" in updates or "target_school_ids" in updates or "target_dept_ids" in updates:
        cur_roles, cur_schools, cur_depts = _targets(a)
        roles = updates.get("target_roles", cur_roles)
        schools = updates.get("target_school_ids", cur_schools)
        depts = updates.get("target_dept_ids", cur_depts)
        roles, schools, depts = _normalize_targets(db, user, roles, schools, depts)
        updates["target_roles"] = roles
        updates["target_school_ids"] = schools
        updates["target_dept_ids"] = depts
        updates["target_type"] = "custom"
        updates["target_school_id"] = None
        updates["target_dept_id"] = None
        updates["target_role"] = "all"

    for key in ["publish_at", "expires_at"]:
        if key in updates:
            if not updates[key]:
                updates[key] = None
            else:
                updates[key] = _parse_dt(updates[key])

    # Validate publish/expiry ordering
    pub = updates.get("publish_at", a.publish_at)
    exp = updates.get("expires_at", a.expires_at)
    if exp and pub and exp <= pub:
        raise HTTPException(status_code=400, detail="Expiry time must be after publish time")

    old_status = _effective_status(a)
    updates["updated_by"] = user.get("faculty_id") or -(user.get("admin_id") or 0)
    for key, val in updates.items():
        if key in ("created_by", "created_by_admin_id", "announcement_id", "created_at", "updated_at", "read_count", "delivery_count"):
            continue
        setattr(a, key, val)

    now = _now_utc()
    new_status = _effective_status(a, now)
    if new_status == "published" and old_status != "published":
        if not a.published_at:
            a.published_at = now
    elif new_status != "published":
        a.published_at = None if new_status == "scheduled" else a.published_at

    db.commit()
    db.refresh(a)

    if new_status == "published":
        _deliver(db, a)
        _broadcast("announcement", {"announcement_id": a.announcement_id, "title": a.title})
    else:
        db.query(AnnouncementNotification).filter(
            AnnouncementNotification.announcement_id == a.announcement_id).delete()
        a.delivery_count = 0
        db.commit()
    return serialize_ann(a, db)

@router.delete("/{announcement_id}")
def delete_announcement(announcement_id: int, db: Session = Depends(get_db),
                        current=Depends(get_current_faculty)):
    user = _resolve_user(db, current)
    if not can_manage(user):
        raise HTTPException(status_code=403, detail="Permission denied")
    a = db.query(Announcement).filter(Announcement.announcement_id == announcement_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    if user.get("type") != "admin" and a.created_by != user.get("faculty_id"):
        raise HTTPException(status_code=403, detail="You can only delete announcements you created")
    atts = db.query(AnnouncementAttachment).filter(
        AnnouncementAttachment.announcement_id == announcement_id).all()
    for att in atts:
        path = os.path.join(UPLOAD_DIR, att.stored_name)
        if os.path.exists(path):
            try:
                os.remove(path)
            except Exception:
                pass
    db.query(AnnouncementAttachment).filter(
        AnnouncementAttachment.announcement_id == announcement_id).delete()
    db.query(AnnouncementRead).filter(
        AnnouncementRead.announcement_id == announcement_id).delete()
    db.query(AnnouncementNotification).filter(
        AnnouncementNotification.announcement_id == announcement_id).delete()
    db.delete(a)
    db.commit()
    _broadcast("announcement", {"announcement_id": announcement_id, "deleted": True})
    return {"message": "Deleted"}

@router.post("/{announcement_id}/read")
def mark_read(announcement_id: int, db: Session = Depends(get_db),
              current=Depends(get_current_faculty)):
    user = _resolve_user(db, current)
    _auto_status(db)
    a = db.query(Announcement).filter(Announcement.announcement_id == announcement_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    notif = _notif_query(db, user).filter(
        AnnouncementNotification.announcement_id == announcement_id).first()
    now = _now_utc()
    if notif:
        if not notif.is_read:
            notif.is_read = True
            notif.read_at = now
    else:
        if user.get("type") == "admin":
            db.add(AnnouncementNotification(announcement_id=announcement_id,
                                            admin_id=user.get("admin_id"), is_read=True, read_at=now))
        else:
            db.add(AnnouncementNotification(announcement_id=announcement_id,
                                            faculty_id=user.get("faculty_id"), is_read=True, read_at=now))
    db.add(AnnouncementRead(announcement_id=announcement_id,
                            faculty_id=user.get("faculty_id"), admin_id=user.get("admin_id"), read_at=now))
    db.commit()
    _broadcast("read", {})
    return {"message": "Marked as read"}

@router.get("/{announcement_id}/reads")
def get_reads(announcement_id: int, db: Session = Depends(get_db),
              current=Depends(get_current_faculty)):
    user = _resolve_user(db, current)
    if not can_manage(user):
        raise HTTPException(status_code=403, detail="Permission denied")
    reads = db.query(AnnouncementRead).filter(
        AnnouncementRead.announcement_id == announcement_id
    ).all()
    fac_ids = [r.faculty_id for r in reads if r.faculty_id]
    facs = db.query(Faculty).filter(Faculty.faculty_id.in_(fac_ids)).all() if fac_ids else []
    fac_map = {f.faculty_id: f.name for f in facs}
    return [
        {"faculty_id": r.faculty_id, "name": fac_map.get(r.faculty_id, "Unknown"),
         "read_at": _iso(r.read_at)}
        for r in reads
    ]

@router.post("/{announcement_id}/attachments")
def upload_attachments(announcement_id: int, files: List[UploadFile] = File(...),
                       db: Session = Depends(get_db), current=Depends(get_current_faculty)):
    user = _resolve_user(db, current)
    if not can_manage(user):
        raise HTTPException(status_code=403, detail="Permission denied")
    a = db.query(Announcement).filter(Announcement.announcement_id == announcement_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    if user.get("type") != "admin" and a.created_by != user.get("faculty_id"):
        raise HTTPException(status_code=403, detail="You can only manage your own announcements")

    uploaded = []
    for f in files:
        ext = os.path.splitext(f.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"File type '{ext}' not allowed")
        f.file.seek(0, 2)
        size = f.file.tell()
        f.file.seek(0)
        if size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"File '{f.filename}' exceeds 25 MB limit")
        stored_name = f"{uuid.uuid4().hex}{ext}"
        dest = os.path.join(UPLOAD_DIR, stored_name)
        with open(dest, "wb") as out:
            shutil.copyfileobj(f.file, out)
        att = AnnouncementAttachment(
            announcement_id=announcement_id,
            filename=f.filename,
            stored_name=stored_name,
            file_size=size,
            content_type=f.content_type or "",
            uploaded_by=user.get("faculty_id"),
        )
        db.add(att)
        uploaded.append(att)

    db.commit()
    count = db.query(AnnouncementAttachment).filter(
        AnnouncementAttachment.announcement_id == announcement_id).count()
    a.attachment_count = count
    db.commit()
    return serialize_ann(a, db)

@router.get("/{announcement_id}/attachments")
def list_attachments(announcement_id: int, db: Session = Depends(get_db),
                     current=Depends(get_current_faculty)):
    user = _resolve_user(db, current)
    a = db.query(Announcement).filter(Announcement.announcement_id == announcement_id).first()
    if not a or not _visible(a, user):
        raise HTTPException(status_code=404, detail="Not found")
    atts = db.query(AnnouncementAttachment).filter(
        AnnouncementAttachment.announcement_id == announcement_id
    ).order_by(AnnouncementAttachment.created_at.desc()).all()
    return [{
        "attachment_id": t.attachment_id,
        "filename": t.filename,
        "file_size": t.file_size or 0,
        "content_type": t.content_type or "",
        "created_at": _iso(t.created_at),
    } for t in atts]

@router.delete("/attachments/{attachment_id}")
def delete_attachment(attachment_id: int, db: Session = Depends(get_db),
                      current=Depends(get_current_faculty)):
    user = _resolve_user(db, current)
    if not can_manage(user):
        raise HTTPException(status_code=403, detail="Permission denied")
    att = db.query(AnnouncementAttachment).filter(
        AnnouncementAttachment.attachment_id == attachment_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Not found")
    a = db.query(Announcement).filter(
        Announcement.announcement_id == att.announcement_id).first()
    if a and user.get("type") != "admin" and a.created_by != user.get("faculty_id"):
        raise HTTPException(status_code=403, detail="You can only manage your own announcements")
    path = os.path.join(UPLOAD_DIR, att.stored_name)
    if os.path.exists(path):
        try:
            os.remove(path)
        except Exception:
            pass
    announcement_id = att.announcement_id
    db.delete(att)
    db.commit()
    a = db.query(Announcement).filter(Announcement.announcement_id == announcement_id).first()
    if a:
        count = db.query(AnnouncementAttachment).filter(
            AnnouncementAttachment.announcement_id == announcement_id).count()
        a.attachment_count = count
        db.commit()
        return serialize_ann(a, db)
    return {"message": "Deleted"}
