from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Faculty, Publication, Project, Patent, PatentFaculty, Achievement, Department, School
from app.routers.auth import get_current_faculty
from collections import defaultdict
from datetime import datetime

router = APIRouter()


def _resolve_hod_scope(db, current):
    """Return (hod_faculty, school, dept) enforcing RBAC.

    The HOD's scope is derived from the authoritative DB record — never from
    request parameters. The school is derived from the assigned department.
    """
    if current.get("role") not in ["hod", "dean_rd"]:
        raise HTTPException(status_code=403, detail="Access denied")

    hod = db.query(Faculty).filter(
        Faculty.faculty_id == current.get("faculty_id")
    ).first()
    if not hod:
        raise HTTPException(status_code=403, detail="Access denied")

    dept_id = hod.dept_id
    if not dept_id:
        raise HTTPException(status_code=403, detail="No department assigned to this account")

    dept = db.query(Department).filter(Department.dept_id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=403, detail="Assigned department not found")

    school = None
    if dept.school_id:
        school = db.query(School).filter(School.school_id == dept.school_id).first()

    return hod, school, dept


@router.get("/dashboard")
def get_hod_dashboard(source: str = "all",
                      db: Session = Depends(get_db),
                      current=Depends(get_current_faculty)):

    hod, school, dept = _resolve_hod_scope(db, current)
    dept_id = dept.dept_id

    # All faculty in this department
    all_faculty = db.query(Faculty).filter(
        Faculty.dept_id == dept_id,
        Faculty.is_active == True
    ).all()

    faculty_ids = [f.faculty_id for f in all_faculty]

    # All publications in dept
    base_q = db.query(Publication).filter(
        Publication.faculty_id.in_(faculty_ids)
    )
    if source and source != "all":
        from app.source_filter import apply_source_filter
        all_pubs = apply_source_filter(db, base_q, source).all()
    else:
        all_pubs = base_q.all()
    total_publications = len(all_pubs)

    pubs_this_year = [p for p in all_pubs if p.year == datetime.now().year]

    # Total citations derived from publication records
    total_citations = sum(p.citations_count or 0 for p in all_pubs)

    # Year-over-year growth
    from app.metrics import yoy_percent, yoy_delta
    pubs_by_year_map = defaultdict(int)
    cit_by_year_map  = defaultdict(int)
    for p in all_pubs:
        if p.year:
            pubs_by_year_map[p.year] += 1
            cit_by_year_map[p.year] += p.citations_count or 0
    pubs_growth = yoy_percent(pubs_by_year_map)
    cits_growth = yoy_percent(cit_by_year_map)
    pubs_delta  = yoy_delta(pubs_by_year_map)

    # Publications by year (dept level)
    pubs_by_year = defaultdict(int)
    for p in all_pubs:
        if p.year:
            pubs_by_year[p.year] += 1

    # Quartile breakdown
    quartile_count = defaultdict(int)
    for p in all_pubs:
        quartile_count[p.quartile] += 1

    # Research areas across dept
    area_count = defaultdict(int)
    for p in all_pubs:
        if p.ml_topic:
            area_count[p.ml_topic] += 1
    total_area = sum(area_count.values()) or 1
    research_areas = [
        {"area": k, "pub_count": v,
         "percent": round(v / total_area * 100, 1)}
        for k, v in sorted(area_count.items(),
                           key=lambda x: x[1], reverse=True)
    ]

    # Top faculty ranked by total publications
    top_faculty = []
    for f in all_faculty:
        pub_count = len([p for p in all_pubs if p.faculty_id == f.faculty_id])
        fac_citations = sum(
            p.citations_count or 0 for p in all_pubs
            if p.faculty_id == f.faculty_id
        )
        top_faculty.append({
            "faculty_id":    f.faculty_id,
            "name":          f.name,
            "designation":   f.designation,
            "publications":  pub_count,
            "citations":     fac_citations,
            "h_index":       f.h_index,
            "i10_index":     f.i10_index,
            "research_score":f.research_score,
        })
    top_faculty.sort(key=lambda x: x["publications"], reverse=True)

    # Projects funding overview
    all_projects = db.query(Project).filter(
        Project.dept_id == dept_id
    ).all()

    funding = defaultdict(float)
    for p in all_projects:
        if p.sponsor_type:
            funding[p.sponsor_type] += p.amount_lakhs or 0
    total_funding = sum(funding.values()) or 1
    funding_overview = [
        {"type": k, "amount": round(v, 2),
         "percent": round(v / total_funding * 100, 1)}
        for k, v in funding.items()
    ]

    # Patents count
    patents_count = db.query(Patent).outerjoin(PatentFaculty).filter(
        (Patent.faculty_id.in_(faculty_ids)) | (PatentFaculty.faculty_id.in_(faculty_ids))
    ).distinct().count()

    # PhD faculty count
    phd_count = len([f for f in all_faculty if f.is_phd])

    # Recent publications
    recent_pubs = sorted(all_pubs, key=lambda p: p.year or 0, reverse=True)[:5]

    # Citations by year for dept — derived from publication records
    dept_citations_by_year = defaultdict(int)
    for p in all_pubs:
        if p.year:
            dept_citations_by_year[p.year] += p.citations_count or 0

    return {
        "scope": {
            "role":        "hod",
            "school_id":   school.school_id if school else None,
            "school_name": school.school_name if school else "",
            "dept_id":     dept.dept_id,
            "dept_code":   dept.dept_code,
            "dept_name":   dept.dept_name,
            "departments": [
                {
                    "dept_id":   dept.dept_id,
                    "dept_code": dept.dept_code,
                    "dept_name": dept.dept_name,
                }
            ],
        },
        "dept_id":   dept_id,
        "kpis": {
            "total_publications":     total_publications,
            "publications_this_year": len(pubs_this_year),
            "total_citations":        int(total_citations),
            "active_faculty":         len(all_faculty),
            "total_faculty":          len(all_faculty),
            "total_funding_lakhs":    round(sum(funding.values()), 2),
            "patents_filed":          patents_count,
            "phd_faculty":            phd_count,
            "phd_percent":            round(phd_count / len(all_faculty) * 100, 1) if all_faculty else 0,
            "growth": {
                "publications":      pubs_growth,
                "publications_abs":  pubs_delta,
                "citations":         cits_growth,
            },
        },
        "publications_by_year": [
            {"year": y, "count": c}
            for y, c in sorted(pubs_by_year.items())
        ],
        "citations_by_year": [
            {"year": y, "count": c}
            for y, c in sorted(dept_citations_by_year.items())
        ],
        "quartile_breakdown": [
            {"quartile": q, "count": cnt}
            for q, cnt in quartile_count.items()
        ],
        "research_areas":  research_areas,
        "top_faculty":     top_faculty[:5],
        "funding_overview":funding_overview,
        "recent_publications": [
            {
                "pub_id":         p.pub_id,
                "title":          p.title,
                "journal_name":   p.journal_name,
                "year":           p.year,
                "quartile":       p.quartile,
                "impact_factor":  p.impact_factor,
                "citations_count":p.citations_count,
                "indexing":       p.indexing,
            }
            for p in recent_pubs
        ],
        "dept_at_glance": {
            "total_faculty":    len(all_faculty),
            "phd_faculty":      phd_count,
            "ongoing_projects": len([p for p in all_projects
                                     if p.status == "Ongoing"]),
            "patents_filed":    patents_count,
            "collaborations":   9,
            "workshops":        12,
        }
    }
@router.get("/faculty-intelligence")
def get_faculty_intelligence(db: Session = Depends(get_db),
                              current=Depends(get_current_faculty)):
    hod, school, dept = _resolve_hod_scope(db, current)
    dept_id = dept.dept_id
    all_faculty = db.query(Faculty).filter(
        Faculty.dept_id == dept_id,
        Faculty.is_active == True
    ).all()

    faculty_ids = [f.faculty_id for f in all_faculty]
    all_pubs    = db.query(Publication).filter(
        Publication.faculty_id.in_(faculty_ids)
    ).all()

    # Build per-faculty stats
    faculty_stats = []
    for f in all_faculty:
        f_pubs = [p for p in all_pubs if p.faculty_id == f.faculty_id]
        f_cit  = sum(p.citations_count or 0 for p in f_pubs)

        cur_yr = datetime.now().year
        pubs_2024 = len([p for p in f_pubs if p.year == cur_yr])
        pubs_2023 = len([p for p in f_pubs if p.year == cur_yr - 1])
        q1_count  = len([p for p in f_pubs if p.quartile == "Q1"])
        q1_pct    = round(q1_count / len(f_pubs) * 100) if f_pubs else 0

        # AI Score (weighted)
        h   = float(f.h_index or 0)
        i10 = float(f.i10_index or 0)
        pubs_total = len(f_pubs)
        cit_norm   = min(float(f_cit) / 100, 30)
        ai_score   = round(
            h * 2.5 +
            i10 * 1.5 +
            pubs_total * 0.8 +
            cit_norm +
            q1_count * 2,
            1
        )

        # Trend
        trend = "up" if pubs_2024 >= pubs_2023 else "down"
        if pubs_2024 > pubs_2023 * 1.3:
            trend = "strong_up"
        elif pubs_2024 == 0 and pubs_2023 == 0:
            trend = "flat"

        # Risk level
        if pubs_2024 == 0 and pubs_total < 3:
            risk = "High"
        elif pubs_2024 == 0:
            risk = "Medium"
        elif q1_pct < 20:
            risk = "Medium"
        else:
            risk = "Low"

        # Status label
        if ai_score >= 85:
            status = "Star Researcher"
        elif trend in ["up", "strong_up"] and pubs_2024 > 0:
            status = "Rising Researcher"
        elif risk == "High":
            status = "At Risk"
        elif risk == "Medium":
            status = "Needs Improvement"
        else:
            status = "Consistent"

        # AI recommendation
        if risk == "High":
            rec = f"No recent publications. Recommend focusing on Q1 journals."
        elif q1_pct < 20 and pubs_total > 5:
            rec = f"Low Q1 ratio ({q1_pct}%). Suggest quality over quantity."
        elif trend == "strong_up":
            rec = f"Excellent growth! Consider applying for DST/ICMR projects."
        else:
            rec = f"Consistent performance. Encourage international collaborations."

        initials = "".join([w[0] for w in f.name.split()
                            if not w.startswith("Dr") and w][:2]).upper()

        faculty_stats.append({
            "faculty_id":   f.faculty_id,
            "name":         f.name,
            "designation":  f.designation or "Faculty",
            "initials":     initials,
            "ai_score":     ai_score,
            "trend":        trend,
            "publications": pubs_total,
            "citations":    int(f_cit),
            "h_index":      h,
            "i10_index":    i10,
            "q1_count":     q1_count,
            "q1_percent":   q1_pct,
            "pubs_2024":    pubs_2024,
            "pubs_2023":    pubs_2023,
            "risk":         risk,
            "status":       status,
            "recommendation": rec,
        })

    faculty_stats.sort(key=lambda x: x["ai_score"], reverse=True)

    # Department health
    total  = len(all_faculty)
    high   = len([f for f in faculty_stats if f["ai_score"] >= 80])
    avg_p  = len([f for f in faculty_stats if 50 <= f["ai_score"] < 80])
    at_risk= len([f for f in faculty_stats if f["ai_score"] < 50])

    all_topics = defaultdict(int)
    for p in all_pubs:
        if p.ml_topic:
            all_topics[p.ml_topic] += 1
    total_topics = sum(all_topics.values()) or 1
    top_areas = [
        {"area": k, "count": v, "percent": round(v/total_topics*100)}
        for k, v in sorted(all_topics.items(), key=lambda x:x[1], reverse=True)[:6]
    ]

    dept_score = round(
        (high / total * 40) +
        (avg_p / total * 25) +
        min(len(all_pubs) / (total * 5) * 20, 20) +
        15,
        0
    ) if total > 0 else 0

    # Top pubs
    top_pubs = sorted(all_pubs, key=lambda p: p.citations_count or 0, reverse=True)[:5]

    return {
        "faculty_stats": faculty_stats,
        "dept_health": {
            "total_faculty":     total,
            "high_performers":   high,
            "avg_performers":    avg_p,
            "need_attention":    at_risk,
            "dept_score":        dept_score,
        },
        "top_areas": top_areas,
        "top_pubs": [
            {
                "title":          p.title,
                "faculty_name":   next((f.name for f in all_faculty
                                       if f.faculty_id == p.faculty_id), ""),
                "journal":        p.journal_name,
                "citations":      p.citations_count,
                "quartile":       p.quartile,
                "year":           p.year,
            }
            for p in top_pubs
        ],
        "ai_recommendations": [
            f for f in faculty_stats if f["risk"] in ["High","Medium"]
        ][:4],
        "dept_recommendations": [
            "Increase Q1 journal publications by 25%",
            "Encourage international collaborations",
            "Apply for more funded research projects",
            "Organize research workshops & seminars",
        ],
    }
