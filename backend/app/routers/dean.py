from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Faculty, Publication, CitationYearly, Project, Patent, Department
from app.routers.auth import get_current_faculty
from collections import defaultdict
from datetime import datetime

router = APIRouter()

@router.get("/dashboard")
def get_dean_dashboard(db: Session = Depends(get_db),
                       current=Depends(get_current_faculty)):

    if current["role"] != "dean_rd":
        raise HTTPException(status_code=403, detail="Access denied")

    # All faculty (exclude dean_rd from stats)
    all_faculty = db.query(Faculty).filter(
        Faculty.role != "dean_rd"
    ).all()
    faculty_ids = [f.faculty_id for f in all_faculty]

    # All publications
    all_pubs = db.query(Publication).filter(
        Publication.faculty_id.in_(faculty_ids)
    ).all()
    cur_year = datetime.now().year
    pubs_this_year = [p for p in all_pubs if p.year == cur_year]

    # Total citations from sync'd faculty.total_citations
    total_citations = sum(f.total_citations or 0 for f in all_faculty)

    # Publications by year (institute)
    pubs_by_year = defaultdict(int)
    for p in all_pubs:
        if p.year:
            pubs_by_year[p.year] += 1

    # Citations by year (institute) — from CitationYearly
    all_citations = db.query(CitationYearly).filter(
        CitationYearly.faculty_id.in_(faculty_ids)
    ).all()
    citations_by_year = defaultdict(int)
    for c in all_citations:
        citations_by_year[c.year] += c.citations_count

    # Quartile breakdown
    quartile_count = defaultdict(int)
    for p in all_pubs:
        quartile_count[p.quartile] += 1

    # Publications by department
    all_depts = db.query(Department).all()
    pubs_by_dept = []
    for dept in all_depts:
        dept_faculty_ids = [
            f.faculty_id for f in all_faculty
            if f.dept_id == dept.dept_id
        ]
        count = len([
            p for p in all_pubs
            if p.faculty_id in dept_faculty_ids
        ])
        if count > 0:
            pubs_by_dept.append({
                "dept":  dept.dept_code,
                "name":  dept.dept_name,
                "count": count,
            })
    pubs_by_dept.sort(key=lambda x: x["count"], reverse=True)

    # Top faculty across ALL departments
    top_faculty = []
    for f in all_faculty:
        if not f.dept_id:
            continue
        pub_count = len([p for p in all_pubs if p.faculty_id == f.faculty_id])
        fac_cit   = f.total_citations or 0
        dept = next((d for d in all_depts if d.dept_id == f.dept_id), None)
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

    # Department scorecard
    dept_scorecard = []
    for dept in all_depts:
        dept_faculty = [f for f in all_faculty if f.dept_id == dept.dept_id]
        dept_pubs    = [p for p in all_pubs if p.faculty_id in [df.faculty_id for df in dept_faculty]]
        dept_cit     = sum(f.total_citations or 0 for f in dept_faculty)
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

    # Average impact factor
    all_ifs = [p.impact_factor for p in all_pubs if p.impact_factor]
    avg_if  = round(sum(all_ifs) / len(all_ifs), 2) if all_ifs else 0

    # Institutional h-index — computed from all publications sorted by citations desc
    cite_counts = sorted([p.citations_count or 0 for p in all_pubs], reverse=True)
    inst_h_index = 0
    for i, c in enumerate(cite_counts, start=1):
        if c >= i:
            inst_h_index = i
        else:
            break

    # Latest publications
    latest_pubs = db.query(Publication).filter(
        Publication.faculty_id.in_(faculty_ids)
    ).order_by(Publication.year.desc()).limit(5).all()

    latest_with_faculty = []
    for p in latest_pubs:
        fac  = next((f for f in all_faculty if f.faculty_id == p.faculty_id), None)
        dept = next((d for d in all_depts if d.dept_id == (fac.dept_id if fac else None)), None)
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
        "kpis": {
            "total_publications":     len(all_pubs),
            "publications_this_year": len(pubs_this_year),
            "total_citations":        int(total_citations),
            "active_faculty":         len([f for f in all_faculty if f.dept_id]),
            "inst_h_index":           inst_h_index,
            "avg_impact_factor":      avg_if,
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