from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Faculty, Publication, CitationYearly, FacultyResearchArea, Achievement, Project, Patent
from app.dependencies import get_current_faculty

router = APIRouter()

@router.get("/{faculty_id}/dashboard")
def get_faculty_dashboard(faculty_id: int, db: Session = Depends(get_db),
                           current=Depends(get_current_faculty)):
    faculty = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    # Publications
    pubs = db.query(Publication).filter(Publication.faculty_id == faculty_id).all()
    pubs_this_year = [p for p in pubs if p.year == 2024]

    # Citations by year
    citations = db.query(CitationYearly).filter(
        CitationYearly.faculty_id == faculty_id
    ).order_by(CitationYearly.year).all()

    # Publications by year
    from collections import defaultdict
    pubs_by_year = defaultdict(int)
    for p in pubs:
        pubs_by_year[p.year] += 1

    # Quartile breakdown
    quartile_count = defaultdict(int)
    for p in pubs:
        quartile_count[p.quartile] += 1

    # Research areas
    areas = db.query(FacultyResearchArea).filter(
        FacultyResearchArea.faculty_id == faculty_id
    ).order_by(FacultyResearchArea.expertise_percent.desc()).all()

    # Recent publications
    recent_pubs = db.query(Publication).filter(
        Publication.faculty_id == faculty_id
    ).order_by(Publication.year.desc()).limit(5).all()

    # Achievements
    achievements = db.query(Achievement).filter(
        Achievement.faculty_id == faculty_id
    ).order_by(Achievement.year.desc()).all()

    # Projects
    projects = db.query(Project).filter(
        Project.faculty_id == faculty_id
    ).all()

    # Patents
    patents = db.query(Patent).filter(
        Patent.faculty_id == faculty_id
    ).all()

    return {
        "faculty": {
            "faculty_id":        faculty.faculty_id,
            "name":              faculty.name,
            "designation":       faculty.designation,
            "dept_id":           faculty.dept_id,
            "h_index":           faculty.h_index,
            "i10_index":         faculty.i10_index,
            "avg_impact_factor": faculty.avg_impact_factor,
            "research_score":    faculty.research_score,
            "google_scholar_id": faculty.google_scholar_id,
        },
        "kpis": {
            "total_publications":  len(pubs),
            "publications_this_year": len(pubs_this_year),
            "total_citations":     faculty.total_citations,
            "h_index":             faculty.h_index,
            "i10_index":           faculty.i10_index,
            "avg_impact_factor":   faculty.avg_impact_factor,
        },
        "publications_by_year": [
            {"year": y, "count": c}
            for y, c in sorted(pubs_by_year.items())
        ],
        "citations_by_year": [
            {"year": c.year, "count": c.citations_count}
            for c in citations
        ],
        "quartile_breakdown": [
            {"quartile": q, "count": cnt}
            for q, cnt in quartile_count.items()
        ],
        "research_areas": [
            {"area": a.area_name, "percent": a.expertise_percent, "pub_count": a.pub_count}
            for a in areas
        ],
        "recent_publications": [
            {
                "pub_id":       p.pub_id,
                "title":        p.title,
                "journal_name": p.journal_name,
                "year":         p.year,
                "quartile":     p.quartile,
                "impact_factor":p.impact_factor,
                "citations_count": p.citations_count,
                "indexing":     p.indexing,
            }
            for p in recent_pubs
        ],
        "achievements": [
            {"title": a.title, "category": a.category,
             "issuer": a.issuer, "year": a.year}
            for a in achievements
        ],
        "projects": [
            {"title": p.title, "sponsor_type": p.sponsor_type,
             "amount_lakhs": p.amount_lakhs, "status": p.status}
            for p in projects
        ],
        "patents": [
            {"title": p.title, "status": p.status, "year": p.year}
            for p in patents
        ],
    }