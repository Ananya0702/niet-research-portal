from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.database import get_db
from app.models import Publication, Faculty, Department, School
from app.routers.auth import get_current_faculty
from pydantic import BaseModel
from typing import Optional
from app.routers.activity import log_activity
from datetime import date, datetime

router = APIRouter()

CONFERENCE_INDICATORS = [
    "conference", "proceedings", "workshop", "symposium", "icml", "cvpr",
    "iccv", "eccv", "acl", "naacl", "emnlp", "neurips", "iclr", "kdd",
    "icde", "icse", "asplos", "micro", "isca", "sigmod", "vldb",
    "mobicom", "sigcomm", "osdi", "sosp", "ccs", "usenix", "aaai",
    "ijcai", "icra", "iros", "iccad", "dac", "cikm", "www",
    "icwsm", "wsdm", "sigir", "iscas", "icassp", "icip", "icpr",
    "icb", "btas", "icmla", "icit", "icacci", "iccct", "icccnt",
    "icacc", "icissp", "iciss", "icic", "icnc", "aita", "icact",
    "icc", "globecom", "infocom", "icon", "icn", "icdcn",
]
JOURNAL_INDICATORS = [
    "journal", "ieee access", "nature", "elsevier", "springer",
    "transactions on", "applied sciences", "international journal",
    "journal of", "acta", "computers &", "lecture notes in",
    "advances in", "proceedings of the ieee", "ieee reviews",
    "acm computing", "acm transactions", "sensors", "energies",
    "molecules", "materials", "nanomaterials", "electronics",
    "remotesensing", "sustainability", "polymers",
]


def classify_publication_type(title: str, journal_name: str) -> str:
    combined = f"{title} {journal_name}".lower()
    for ind in CONFERENCE_INDICATORS:
        if ind in combined:
            return "Conference"
    for ind in JOURNAL_INDICATORS:
        if ind in combined:
            return "Journal"
    return "Journal"


def _resolve_scope(db: Session, current: dict, scope: str):
    """Return (faculty_ids, school_name) based on scope for the current user.
    For non-dean roles, always return just their own faculty_id."""
    role = current["role"]

    if role != "dean_rd":
        return [current["faculty_id"]], ""

    # Dean role
    dean_id = current["faculty_id"]
    dean = db.query(Faculty).filter(Faculty.faculty_id == dean_id).first()
    if not dean:
        raise HTTPException(403, "Dean not found")

    dean_school_id = dean.school_id
    if not dean_school_id:
        raise HTTPException(403, "Dean has no school assigned. Contact admin.")

    if scope == "my":
        return [dean_id], ""

    # School scope — get all faculty in the Dean's school
    school = db.query(School).filter(School.school_id == dean_school_id).first()
    school_name = school.school_name if school else ""

    # Get department IDs in this school
    dept_ids = [d.dept_id for d in db.query(Department.dept_id)
                .filter(Department.school_id == dean_school_id).all()]

    # Get all faculty in those departments OR with same school_id
    fac_ids = [f.faculty_id for f in db.query(Faculty.faculty_id)
               .filter(or_(
                   Faculty.dept_id.in_(dept_ids),
                   Faculty.school_id == dean_school_id,
               )).all()]

    return fac_ids, school_name


class PublicationCreate(BaseModel):
    title:             str
    journal_name:      str
    doi:               Optional[str] = None
    indexing:          str = "None"
    quartile:          str = "N/A"
    impact_factor:     float = 0
    year:              int
    citations_count:   int = 0
    publication_type:  Optional[str] = None
    abstract:          Optional[str] = None
    conference_name:   Optional[str] = None
    conference_location: Optional[str] = None
    publisher:         Optional[str] = None
    volume:            Optional[str] = None
    issue:             Optional[str] = None
    pages:             Optional[str] = None
    issn:              Optional[str] = None
    isbn:              Optional[str] = None
    keywords:          Optional[str] = None
    research_area:     Optional[str] = None
    sub_area:          Optional[str] = None
    language:          Optional[str] = "English"
    country:           Optional[str] = None
    pdf_url:           Optional[str] = None
    publication_url:   Optional[str] = None
    dataset_url:       Optional[str] = None
    github_url:        Optional[str] = None
    status:            Optional[str] = "Published"
    submission_date:   Optional[date] = None
    acceptance_date:   Optional[date] = None


def _pub_to_dict(p, include_faculty=False):
    d = {
        "pub_id":          p.pub_id,
        "faculty_id":      p.faculty_id,
        "title":           p.title,
        "journal_name":    p.journal_name or "",
        "doi":             p.doi or "",
        "indexing":        p.indexing or "None",
        "quartile":        p.quartile or "N/A",
        "impact_factor":   p.impact_factor or 0,
        "year":            p.year,
        "citations_count": p.citations_count or 0,
        "ml_topic":        p.ml_topic or "",
        "publication_type": p.publication_type or "",
        "abstract":        p.abstract or "",
        "conference_name": p.conference_name or "",
        "conference_location": p.conference_location or "",
        "publisher":       p.publisher or "",
        "volume":          p.volume or "",
        "issue":           p.issue or "",
        "pages":           p.pages or "",
        "issn":            p.issn or "",
        "isbn":            p.isbn or "",
        "keywords":        p.keywords or "",
        "research_area":   p.research_area or "",
        "sub_area":        p.sub_area or "",
        "language":        p.language or "English",
        "country":         p.country or "",
        "pdf_url":         p.pdf_url or "",
        "publication_url": p.publication_url or "",
        "dataset_url":     p.dataset_url or "",
        "github_url":      p.github_url or "",
        "status":          p.status or "Published",
        "submission_date": p.submission_date.isoformat() if p.submission_date else "",
        "acceptance_date": p.acceptance_date.isoformat() if p.acceptance_date else "",
        "created_at":      p.created_at.isoformat() if p.created_at else "",
        "updated_at":      p.updated_at.isoformat() if p.updated_at else "",
    }
    if include_faculty and p.faculty:
        d["faculty_name"] = p.faculty.name
        d["faculty_email"] = p.faculty.email
        d["designation"] = p.faculty.designation
        d["faculty_photo"] = p.faculty.profile_photo_url or ""
        dept = p.faculty.department
        if dept:
            d["department"] = dept.dept_name
            d["dept_code"] = dept.dept_code
            school = dept.school
            d["school"] = school.school_name if school else ""
        else:
            d["department"] = ""
            d["dept_code"] = ""
            d["school"] = ""
    return d


@router.get("/")
def get_publications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str = "",
    pub_type: str = "",
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    quartile: str = "",
    indexing: str = "",
    dept_id: Optional[int] = None,
    school_id: Optional[int] = None,
    faculty_id: Optional[int] = None,
    scope: str = "my",
    sort_by: str = "year",
    sort_dir: str = "desc",
    db: Session = Depends(get_db),
    current=Depends(get_current_faculty),
):
    query = db.query(Publication).join(Faculty)

    # Apply scope
    if current["role"] == "dean_rd":
        fac_ids, _ = _resolve_scope(db, current, scope)
        query = query.filter(Publication.faculty_id.in_(fac_ids))
    else:
        query = query.filter(Publication.faculty_id == current["faculty_id"])
        if faculty_id:
            query = query.filter(Publication.faculty_id == faculty_id)

    if search:
        q = f"%{search}%"
        query = query.filter(or_(
            Publication.title.ilike(q),
            Publication.journal_name.ilike(q),
            Publication.doi.ilike(q),
            Publication.keywords.ilike(q),
            Publication.publisher.ilike(q),
            Publication.conference_name.ilike(q),
            Publication.research_area.ilike(q),
            Publication.abstract.ilike(q),
            Faculty.name.ilike(q),
        ))

    if pub_type:
        if pub_type == "Journal":
            query = query.filter(Publication.publication_type == "Journal")
        elif pub_type == "Conference":
            query = query.filter(Publication.publication_type == "Conference")

    if year_from:
        query = query.filter(Publication.year >= year_from)
    if year_to:
        query = query.filter(Publication.year <= year_to)
    if quartile:
        query = query.filter(Publication.quartile == quartile)
    if indexing:
        query = query.filter(Publication.indexing == indexing)
    if dept_id:
        query = query.filter(Faculty.dept_id == dept_id)

    sort_col = getattr(Publication, sort_by, Publication.year)
    if sort_dir == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    total = query.count()
    pubs = query.offset((page - 1) * per_page).limit(per_page).all()

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": max(1, (total + per_page - 1) // per_page),
        "publications": [_pub_to_dict(p, include_faculty=True) for p in pubs],
    }


@router.get("/{pub_id}")
def get_publication(pub_id: int, db: Session = Depends(get_db),
                    current=Depends(get_current_faculty)):
    pub = db.query(Publication).filter(Publication.pub_id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")

    # Enforce access: non-dean can only see own pubs; dean sees within school
    if current["role"] == "dean_rd":
        fac_ids, _ = _resolve_scope(db, current, "school")
        if pub.faculty_id not in fac_ids:
            raise HTTPException(403, "Access denied")
    elif pub.faculty_id != current["faculty_id"]:
        raise HTTPException(403, "Access denied")

    similar = []
    try:
        similar_q = db.query(Publication).filter(
            Publication.pub_id != pub_id,
            Publication.faculty_id == pub.faculty_id
        )
        if pub.keywords:
            kw_list = [k.strip() for k in pub.keywords.split(",") if k.strip()]
            if kw_list:
                kw_filters = [Publication.keywords.ilike(f"%{kw}%") for kw in kw_list]
                similar_q = similar_q.filter(or_(*kw_filters))
        elif pub.research_area:
            similar_q = similar_q.filter(
                Publication.research_area.ilike(f"%{pub.research_area}%")
            )
        similar = similar_q.order_by(Publication.year.desc()).limit(5).all()
    except Exception:
        similar = []

    result = _pub_to_dict(pub, include_faculty=True)

    from app.models import CitationYearly
    citations_by_year = db.query(CitationYearly).filter(
        CitationYearly.faculty_id == pub.faculty_id
    ).order_by(CitationYearly.year).all()
    result["citations_by_year"] = [
        {"year": c.year, "count": c.citations_count} for c in citations_by_year
    ]
    result["similar_publications"] = [_pub_to_dict(s) for s in similar]
    result["total_citations"] = sum(c.citations_count for c in citations_by_year)

    return result


@router.get("/stats/counts")
def get_publication_counts(
    scope: str = "my",
    db: Session = Depends(get_db),
    current=Depends(get_current_faculty),
):
    query = db.query(Publication)

    if current["role"] == "dean_rd":
        fac_ids, _ = _resolve_scope(db, current, scope)
        query = query.filter(Publication.faculty_id.in_(fac_ids))
    else:
        query = query.filter(Publication.faculty_id == current["faculty_id"])

    total = query.count()
    journal = query.filter(Publication.publication_type == "Journal").count()
    conference = query.filter(Publication.publication_type == "Conference").count()
    unclassified = total - journal - conference

    return {
        "total": total,
        "journal": journal + unclassified,
        "conference": conference,
        "unclassified": unclassified,
    }


@router.post("/")
def add_publication(pub: PublicationCreate,
                    db: Session = Depends(get_db),
                    current=Depends(get_current_faculty)):
    pub_type = pub.publication_type
    if not pub_type:
        pub_type = classify_publication_type(pub.title, pub.journal_name)

    ml_result = {"ml_topic": None, "indexing": pub.indexing, "quartile": pub.quartile}
    try:
        from app.ml.classifier import process_publication
        ml_result = process_publication(pub.title, pub.journal_name)
        if ml_result["indexing"] != "None":
            pub.indexing = ml_result["indexing"]
        if ml_result["quartile"] != "N/A":
            pub.quartile = ml_result["quartile"]
    except Exception:
        pass

    new_pub = Publication(
        faculty_id        = current["faculty_id"],
        title             = pub.title,
        journal_name      = pub.journal_name,
        doi               = pub.doi,
        indexing          = pub.indexing,
        quartile          = pub.quartile,
        impact_factor     = pub.impact_factor,
        year              = pub.year,
        citations_count   = pub.citations_count,
        ml_topic          = ml_result.get("ml_topic"),
        publication_type  = pub_type,
        abstract          = pub.abstract,
        conference_name   = pub.conference_name,
        conference_location = pub.conference_location,
        publisher         = pub.publisher,
        volume            = pub.volume,
        issue             = pub.issue,
        pages             = pub.pages,
        issn              = pub.issn,
        isbn              = pub.isbn,
        keywords          = pub.keywords,
        research_area     = pub.research_area,
        sub_area          = pub.sub_area,
        language          = pub.language or "English",
        country           = pub.country,
        pdf_url           = pub.pdf_url,
        publication_url   = pub.publication_url,
        dataset_url       = pub.dataset_url,
        github_url        = pub.github_url,
        status            = pub.status or "Published",
        submission_date   = pub.submission_date,
        acceptance_date   = pub.acceptance_date,
    )
    db.add(new_pub)

    faculty = db.query(Faculty).filter(
        Faculty.faculty_id == current["faculty_id"]
    ).first()
    if faculty:
        faculty.total_publications = (faculty.total_publications or 0) + 1

    db.commit()
    db.refresh(new_pub)
    log_activity(db, current["faculty_id"], "publication_added",
                 f"Added publication: {pub.title[:60]}")
    return {"message": "Publication added successfully", "pub_id": new_pub.pub_id,
            "ml_topic": new_pub.ml_topic, "quartile": new_pub.quartile,
            "indexing": new_pub.indexing, "publication_type": new_pub.publication_type}


@router.put("/{pub_id}")
def update_publication(pub_id: int, pub: PublicationCreate,
                       db: Session = Depends(get_db),
                       current=Depends(get_current_faculty)):
    existing = db.query(Publication).filter(Publication.pub_id == pub_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Publication not found")
    if current["role"] not in ["dean_rd"] and existing.faculty_id != current["faculty_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    pub_type = pub.publication_type or classify_publication_type(pub.title, pub.journal_name)

    for field in ["title", "journal_name", "doi", "indexing", "quartile",
                  "impact_factor", "year", "citations_count", "publication_type",
                  "abstract", "conference_name", "conference_location", "publisher",
                  "volume", "issue", "pages", "issn", "isbn", "keywords",
                  "research_area", "sub_area", "language", "country", "pdf_url",
                  "publication_url", "dataset_url", "github_url", "status"]:
        setattr(existing, field, getattr(pub, field))
    existing.submission_date = pub.submission_date
    existing.acceptance_date = pub.acceptance_date
    existing.updated_at = datetime.utcnow()
    existing.publication_type = pub_type

    db.commit()
    return {"message": "Publication updated", "pub_id": existing.pub_id}


@router.delete("/{pub_id}")
def delete_publication(pub_id: int, db: Session = Depends(get_db),
                       current=Depends(get_current_faculty)):
    pub = db.query(Publication).filter(Publication.pub_id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")
    if current["role"] not in ["dean_rd"] and pub.faculty_id != current["faculty_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    db.delete(pub)
    db.commit()
    return {"message": "Deleted successfully"}
