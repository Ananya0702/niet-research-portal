from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Faculty, Publication, Project, Patent, Department, School
from app.routers.auth import get_current_faculty
from collections import defaultdict
from datetime import datetime

router = APIRouter()


def _resolve_dean_scope(db, current):
    """Return (dean_faculty, school, school_depts, scope_dept_id) enforcing RBAC.

    The dean's scope is always derived from the authoritative DB record for the
    logged-in user — never from request query parameters. Any department filter
    is validated to belong to the dean's assigned school.
    """
    if current.get("role") != "dean_rd":
        raise HTTPException(status_code=403, detail="Access denied")

    dean = db.query(Faculty).filter(
        Faculty.faculty_id == current.get("faculty_id")
    ).first()
    if not dean or dean.role != "dean_rd":
        raise HTTPException(status_code=403, detail="Access denied")

    school_id = dean.school_id
    if not school_id:
        raise HTTPException(status_code=403, detail="No school assigned to this account")

    school = db.query(School).filter(School.school_id == school_id).first()
    if not school:
        raise HTTPException(status_code=403, detail="Assigned school not found")

    school_depts = db.query(Department).filter(
        Department.school_id == school_id
    ).order_by(Department.dept_code.asc()).all()

    return dean, school, school_depts


def _scoped_faculty(db, school_depts, scope_dept_id):
    """Faculty belonging to the school (by department), optionally one dept."""
    dept_ids = [d.dept_id for d in school_depts]
    q = db.query(Faculty).filter(
        Faculty.dept_id.in_(dept_ids),
        Faculty.role != "dean_rd",
    )
    if scope_dept_id:
        q = q.filter(Faculty.dept_id == scope_dept_id)
    return q.all()


@router.get("/dashboard")
def get_dean_dashboard(
    dept_id: int = None,
    source: str = "all",
    db: Session = Depends(get_db),
    current=Depends(get_current_faculty),
):
    dean, school, school_depts = _resolve_dean_scope(db, current)

    # Validate department filter — must belong to the dean's school
    scope_dept_id = None
    if dept_id is not None:
        dept = db.query(Department).filter(
            Department.dept_id == dept_id,
            Department.school_id == school.school_id,
        ).first()
        if not dept:
            raise HTTPException(status_code=403, detail="Department outside your school scope")
        scope_dept_id = dept_id

    all_faculty = _scoped_faculty(db, school_depts, scope_dept_id)
    faculty_ids = [f.faculty_id for f in all_faculty]

    pubs_q = db.query(Publication).filter(
        Publication.faculty_id.in_(faculty_ids)
    ) if faculty_ids else None
    if pubs_q is not None and source and source != "all":
        from app.source_filter import apply_source_filter
        pubs_q = apply_source_filter(db, pubs_q, source)
    all_pubs = pubs_q.all() if pubs_q is not None else []
    cur_year = datetime.now().year
    pubs_this_year = [p for p in all_pubs if p.year == cur_year]

    # Total citations derived from publication records
    total_citations = sum(p.citations_count or 0 for p in all_pubs)

    # Publications by year
    pubs_by_year = defaultdict(int)
    for p in all_pubs:
        if p.year:
            pubs_by_year[p.year] += 1

    # Citations by year — derived from publication records
    citations_by_year = defaultdict(int)
    for p in all_pubs:
        if p.year:
            citations_by_year[p.year] += p.citations_count or 0

    # Year-over-year growth
    from app.metrics import yoy_percent, yoy_delta, avg_if_by_year
    pubs_growth = yoy_percent(pubs_by_year)
    cits_growth = yoy_percent(citations_by_year)
    if_growth   = yoy_percent(avg_if_by_year(all_pubs))
    pubs_delta  = yoy_delta(pubs_by_year)

    # Quartile breakdown
    quartile_count = defaultdict(int)
    for p in all_pubs:
        quartile_count[p.quartile] += 1

    # Publications by department (within school scope)
    pubs_by_dept = []
    for dept in school_depts:
        if scope_dept_id and dept.dept_id != scope_dept_id:
            continue
        dept_faculty_ids = [
            f.faculty_id for f in all_faculty if f.dept_id == dept.dept_id
        ]
        count = len([p for p in all_pubs if p.faculty_id in dept_faculty_ids])
        if count > 0:
            pubs_by_dept.append({
                "dept":  dept.dept_code,
                "name":  dept.dept_name,
                "count": count,
            })
    pubs_by_dept.sort(key=lambda x: x["count"], reverse=True)

    # Top faculty
    top_faculty = []
    for f in all_faculty:
        if not f.dept_id:
            continue
        pub_count = len([p for p in all_pubs if p.faculty_id == f.faculty_id])
        fac_cit   = sum(
            p.citations_count or 0 for p in all_pubs
            if p.faculty_id == f.faculty_id
        )
        dept = next((d for d in school_depts if d.dept_id == f.dept_id), None)
        top_faculty.append({
            "faculty_id":     f.faculty_id,
            "name":           f.name,
            "dept_code":      dept.dept_code if dept else "—",
            "publications":   pub_count,
            "citations":      int(fac_cit),
            "h_index":        f.h_index,
            "research_score": f.research_score,
        })
    top_faculty.sort(key=lambda x: x["research_score"] or 0, reverse=True)

    # Department scorecard (within school scope)
    dept_scorecard = []
    for dept in school_depts:
        if scope_dept_id and dept.dept_id != scope_dept_id:
            continue
        dept_faculty = [f for f in all_faculty if f.dept_id == dept.dept_id]
        dept_pubs    = [p for p in all_pubs if p.faculty_id in [df.faculty_id for df in dept_faculty]]
        dept_cit     = sum(p.citations_count or 0 for p in dept_pubs)
        q1_count = len([p for p in dept_pubs if p.quartile == "Q1"])
        score = round(
            q1_count * 4 +
            len(dept_pubs) * 2 +
            (dept_cit * 0.01),
            1
        )
        if dept_faculty:
            dept_scorecard.append({
                "dept_id":      dept.dept_id,
                "dept_name":    dept.dept_name,
                "dept_code":    dept.dept_code,
                "publications": len(dept_pubs),
                "citations":    dept_cit,
                "q1_papers":    q1_count,
                "faculty_count":len(dept_faculty),
                "score":        score,
            })
    dept_scorecard.sort(key=lambda x: x["score"], reverse=True)

    # Average impact factor (None when no real data → UI shows N/A)
    from app.metrics import avg_if
    avg_if = avg_if(all_pubs)

    # Scoped h-index
    cite_counts = sorted([p.citations_count or 0 for p in all_pubs], reverse=True)
    inst_h_index = 0
    for i, c in enumerate(cite_counts, start=1):
        if c >= i:
            inst_h_index = i
        else:
            break

    # Latest publications
    latest_q = db.query(Publication).filter(
        Publication.faculty_id.in_(faculty_ids)
    )
    if source and source != "all":
        from app.source_filter import apply_source_filter
        latest_q = apply_source_filter(db, latest_q, source)
    latest_pubs = latest_q.order_by(Publication.year.desc()).limit(5).all() if faculty_ids else []

    latest_with_faculty = []
    for p in latest_pubs:
        fac  = next((f for f in all_faculty if f.faculty_id == p.faculty_id), None)
        dept = next((d for d in school_depts if d.dept_id == (fac.dept_id if fac else None)), None)
        latest_with_faculty.append({
            "pub_id":       p.pub_id,
            "title":        p.title,
            "journal_name": p.journal_name,
            "year":         p.year,
            "quartile":     p.quartile,
            "impact_factor":p.impact_factor,
            "indexing":     p.indexing,
            "faculty_name": fac.name if fac else "—",
            "dept_code":    dept.dept_code if dept else "—",
        })

    return {
        "scope": {
            "role":        "dean_rd",
            "school_id":   school.school_id,
            "school_name": school.school_name,
            "dept_id":     scope_dept_id,
            "departments": [
                {
                    "dept_id":   d.dept_id,
                    "dept_code": d.dept_code,
                    "dept_name": d.dept_name,
                }
                for d in school_depts
            ],
        },
        "kpis": {
            "total_publications":     len(all_pubs),
            "publications_this_year": len(pubs_this_year),
            "total_citations":        int(total_citations),
            "active_faculty":         len(all_faculty),
            "inst_h_index":           inst_h_index,
            "avg_impact_factor":      avg_if,
            "growth": {
                "publications":      pubs_growth,
                "publications_abs":  pubs_delta,
                "citations":         cits_growth,
                "impact_factor":     if_growth,
            },
        },
        "publications_by_year": [
            {"year": y, "count": c}
            for y, c in sorted(pubs_by_year.items())
        ],
        "citations_by_year": [
            {"year": y, "count": c}
            for y, c in sorted(citations_by_year.items())
        ],
        "quartile_breakdown": [
            {"quartile": q, "count": cnt}
            for q, cnt in quartile_count.items()
        ],
        "publications_by_dept": pubs_by_dept,
        "top_faculty":          top_faculty[:5],
        "dept_scorecard":       dept_scorecard,
        "latest_publications":  latest_with_faculty,
    }
