from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Faculty, Publication, CitationYearly, FacultyResearchArea, Achievement, Project, Patent
from app.dependencies import get_current_faculty
from pydantic import BaseModel
from typing import Optional

from collections import defaultdict
from datetime import datetime

from fastapi.responses import StreamingResponse
import io

router = APIRouter()

class ProfileUpdate(BaseModel):
    name:              Optional[str] = None
    designation:       Optional[str] = None
    bio:               Optional[str] = None
    google_scholar_id: Optional[str] = None
    
    profile_photo_url: Optional[str] = None

# ── IMPORTANT: /me/ routes must come BEFORE /{faculty_id}/... ──
@router.get("/me/profile")
def get_my_profile(db: Session = Depends(get_db),
                   current=Depends(get_current_faculty)):
    faculty = db.query(Faculty).filter(
        Faculty.faculty_id == current["faculty_id"]
    ).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Not found")

    pubs = db.query(Publication).filter(
        Publication.faculty_id == faculty.faculty_id
    ).all()

    dept_name = None
    dept_code = None
    school_name = None
    school_id = faculty.school_id
    if faculty.dept_id:
        from app.models import Department, School
        dept = db.query(Department).filter(
            Department.dept_id == faculty.dept_id
        ).first()
        if dept:
            dept_name = dept.dept_name
            dept_code = dept.dept_code
            if dept.school:
                school_name = dept.school.school_name
                school_id = dept.school.school_id
    if not school_name and faculty.school_id:
        from app.models import School
        sch = db.query(School).filter(School.school_id == faculty.school_id).first()
        if sch:
            school_name = sch.school_name

    return {
        "faculty_id":        faculty.faculty_id,
        "name":              faculty.name,
        "email":             faculty.email,
        "designation":       faculty.designation,
        "role":              faculty.role,
        "dept_name":         dept_name,
        "dept_code":         dept_code,
        "dept_id":           faculty.dept_id,
        "school_name":       school_name,
        "school_id":         school_id,
        "is_phd":            faculty.is_phd,
        "joining_year":      faculty.joining_year,
        "google_scholar_id": faculty.google_scholar_id,
        
        "bio":               faculty.bio,
        "profile_photo_url": faculty.profile_photo_url,
        "h_index":           faculty.h_index,
        "i10_index":         faculty.i10_index,
        "research_score":    faculty.research_score,
        "total_publications":len(pubs),
        "total_citations":   sum(p.citations_count or 0 for p in pubs),
    }

@router.put("/me/profile")
def update_my_profile(updates: ProfileUpdate,
                      db: Session = Depends(get_db),
                      current=Depends(get_current_faculty)):
    faculty = db.query(Faculty).filter(
        Faculty.faculty_id == current["faculty_id"]
    ).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Not found")

    update_data = updates.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(faculty, key, value)

    db.commit()
    db.refresh(faculty)
    return {"message": "Profile updated successfully"}

# ── Existing dashboard route (must come AFTER /me/ routes) ──
@router.get("/{faculty_id}/dashboard")
def get_faculty_dashboard(faculty_id: int,
                          source: str = "all",
                          db: Session = Depends(get_db)):

    faculty = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    base_q = db.query(Publication).filter(Publication.faculty_id == faculty_id)
    if source and source != "all":
        from app.source_filter import apply_source_filter
        pubs = apply_source_filter(db, base_q, source).all()
    else:
        pubs = base_q.all()
    total_publications = len(pubs)
    current_year = datetime.now().year
    pubs_this_year = [p for p in pubs if p.year == current_year]

    # Citations & impact factor derived from the publication records
    total_citations = sum(p.citations_count or 0 for p in pubs)
    from app.metrics import avg_if
    avg_if = avg_if(pubs)

    pubs_by_year = defaultdict(int)
    cit_by_year = defaultdict(int)
    for p in pubs:
        pubs_by_year[p.year] += 1
        if p.year:
            cit_by_year[p.year] += p.citations_count or 0

    quartile_count = defaultdict(int)
    for p in pubs:
        quartile_count[p.quartile] += 1

    from app.metrics import yoy_percent, yoy_delta, avg_if_by_year
    pubs_growth    = yoy_percent(pubs_by_year)
    cits_growth    = yoy_percent(cit_by_year)
    if_by_year     = avg_if_by_year(pubs)
    if_growth      = yoy_percent(if_by_year)
    pubs_delta     = yoy_delta(pubs_by_year)

    areas = db.query(FacultyResearchArea).filter(
        FacultyResearchArea.faculty_id == faculty_id
    ).order_by(FacultyResearchArea.expertise_percent.desc()).all()

    recent_pubs = sorted(pubs, key=lambda p: p.year or 0, reverse=True)[:5]

    achievements = db.query(Achievement).filter(
        Achievement.faculty_id == faculty_id
    ).order_by(Achievement.year.desc()).all()

    projects = db.query(Project).filter(
        Project.faculty_id == faculty_id
    ).all()

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
            "avg_impact_factor": avg_if,
            "research_score":    faculty.research_score,
            "google_scholar_id": faculty.google_scholar_id,
        },
        "kpis": {
            "total_publications":  total_publications,
            "publications_this_year": len(pubs_this_year),
            "total_citations":     total_citations,
            "h_index":             faculty.h_index,
            "i10_index":           faculty.i10_index,
            "avg_impact_factor":   avg_if,
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
            for y, c in sorted(cit_by_year.items())
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
        "all_publications": [
            {
                "pub_id":       p.pub_id,
                "title":        p.title,
                "journal_name": p.journal_name,
                "year":         p.year,
                "quartile":     p.quartile,
                "impact_factor":p.impact_factor,
                "citations_count": p.citations_count,
                "indexing":     p.indexing,
                "doi":          p.doi,
            }
            for p in pubs
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
@router.get("/me/analytics")
def get_my_analytics(source: str = "all",
                     db: Session = Depends(get_db),
                     current=Depends(get_current_faculty)):
    faculty_id = current["faculty_id"]
    faculty = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()

    query = db.query(Publication).filter(Publication.faculty_id == faculty_id)
    if source and source != "all":
        from app.source_filter import apply_source_filter
        query = apply_source_filter(db, query, source)
    pubs = query.all()

    # Publications by year
    from collections import defaultdict
    pubs_by_year = defaultdict(int)
    for p in pubs:
        if p.year:
            pubs_by_year[p.year] += 1

    # Quartile trend by year
    quartile_by_year = defaultdict(lambda: defaultdict(int))
    for p in pubs:
        if p.year and p.quartile:
            quartile_by_year[p.year][p.quartile] += 1

    quartile_trend = [
        {
            "year":  y,
            "Q1":    quartile_by_year[y].get("Q1", 0),
            "Q2":    quartile_by_year[y].get("Q2", 0),
            "Q3":    quartile_by_year[y].get("Q3", 0),
            "Q4":    quartile_by_year[y].get("Q4", 0),
        }
        for y in sorted(quartile_by_year.keys())
    ]

    # Indexing breakdown
    indexing_count = defaultdict(int)
    for p in pubs:
        indexing_count[p.indexing or "None"] += 1

    # Topic breakdown
    topic_count = defaultdict(int)
    for p in pubs:
        if p.ml_topic:
            topic_count[p.ml_topic] += 1

    # Citations by year — derived from publication records
    citations_by_year = defaultdict(int)
    for p in pubs:
        if p.year:
            citations_by_year[p.year] += p.citations_count or 0

    # Impact factor distribution
    from app.metrics import avg_if
    avg_if = avg_if(pubs)

    # Q1 percentage
    q1_count = len([p for p in pubs if p.quartile == "Q1"])
    q1_percent = round(q1_count / len(pubs) * 100, 1) if pubs else 0

    return {
        "summary": {
            "total_publications": len(pubs),
            "q1_publications":    q1_count,
            "q1_percent":         q1_percent,
            "avg_impact_factor":  avg_if,
            "total_citations":    sum(p.citations_count or 0 for p in pubs),
            "years_active":       len(pubs_by_year),
        },
        "publications_by_year": [
            {"year": y, "count": c}
            for y, c in sorted(pubs_by_year.items())
        ],
        "quartile_trend":    quartile_trend,
        "citations_by_year": [
            {"year": y, "count": c}
            for y, c in sorted(citations_by_year.items())
        ],
        "indexing_breakdown": [
            {"indexing": k, "count": v}
            for k, v in sorted(indexing_count.items(),
                               key=lambda x: x[1], reverse=True)
        ],
        "topic_breakdown": [
            {"topic": k, "count": v}
            for k, v in sorted(topic_count.items(),
                               key=lambda x: x[1], reverse=True)
        ],
    }
class PasswordUpdate(BaseModel):
    current_password: str
    new_password:     str

@router.put("/me/password")
def change_password(data: PasswordUpdate,
                    db: Session = Depends(get_db),
                    current=Depends(get_current_faculty)):
    from app.security import verify_password, get_password_hash
    faculty = db.query(Faculty).filter(
        Faculty.faculty_id == current["faculty_id"]
    ).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Not found")
    if not verify_password(data.current_password, faculty.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    faculty.password_hash = get_password_hash(data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@router.get("/me/report/excel")
def download_excel_report(db: Session = Depends(get_db),
                           current=Depends(get_current_faculty)):
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    faculty = db.query(Faculty).filter(
        Faculty.faculty_id == current["faculty_id"]
    ).first()

    pubs = db.query(Publication).filter(
        Publication.faculty_id == current["faculty_id"]
    ).order_by(Publication.year.desc()).all()

    wb = openpyxl.Workbook()

    # ── Styles ──────────────────────────────────────────────────────
    hdr_fill   = PatternFill("solid", fgColor="534AB7")
    hdr_font   = Font(bold=True, color="FFFFFF", size=11)
    title_font = Font(bold=True, size=14, color="534AB7")
    bold_font  = Font(bold=True, size=11)
    bd = Side(style="thin", color="CCCCCC")
    border = Border(left=bd, right=bd, top=bd, bottom=bd)
    center = Alignment(horizontal="center", vertical="center")
    left   = Alignment(horizontal="left",   vertical="center", wrap_text=True)

    def style_header_row(ws, row, cols):
        for col in range(1, cols+1):
            c = ws.cell(row=row, column=col)
            c.fill   = hdr_fill
            c.font   = hdr_font
            c.border = border
            c.alignment = center

    def style_data_row(ws, row, cols, alt=False):
        fill = PatternFill("solid", fgColor="EEEDFE") if alt else PatternFill("solid", fgColor="FFFFFF")
        for col in range(1, cols+1):
            c = ws.cell(row=row, column=col)
            c.fill   = fill
            c.border = border
            c.alignment = left

    # ── Sheet 1: Profile Summary ─────────────────────────────────────
    ws1 = wb.active
    ws1.title = "Profile Summary"
    ws1.column_dimensions["A"].width = 28
    ws1.column_dimensions["B"].width = 40

    ws1["A1"] = "NIET Research Analytics Portal"
    ws1["A1"].font = Font(bold=True, size=16, color="534AB7")
    ws1.merge_cells("A1:B1")

    ws1["A2"] = f"Research Profile — {faculty.name}"
    ws1["A2"].font = Font(bold=True, size=13, color="1a1a1a")
    ws1.merge_cells("A2:B2")

    ws1["A3"] = f"Generated: {__import__('datetime').datetime.now().strftime('%d %B %Y')}"
    ws1["A3"].font = Font(size=10, color="888888")
    ws1.merge_cells("A3:B3")

    ws1.append([])

    from app.metrics import avg_if as _avg_if
    avg_if = _avg_if(pubs)
    info_rows = [
        ("Name",              faculty.name),
        ("Designation",       faculty.designation),
        ("Email",             faculty.email),
        ("Google Scholar ID", faculty.google_scholar_id or "Not set"),
        ("Joining Year",      faculty.joining_year),
        ("PhD Holder",        "Yes" if faculty.is_phd else "No"),
        ("",                  ""),
        ("RESEARCH METRICS",  ""),
        ("Total Publications",len(pubs)),
        ("Total Citations",   sum(p.citations_count or 0 for p in pubs)),
        ("h-index",           faculty.h_index),
        ("i10-index",         faculty.i10_index),
        ("Avg Impact Factor", avg_if if avg_if else "N/A"),
        ("Research Score",    faculty.research_score),
    ]

    for i, (label, value) in enumerate(info_rows, start=5):
        ws1.cell(row=i, column=1, value=label).font = Font(bold=True, size=11)
        ws1.cell(row=i, column=2, value=str(value) if value else "")
        if label == "RESEARCH METRICS":
            ws1.cell(row=i, column=1).font = Font(bold=True, size=12, color="534AB7")

    # ── Sheet 2: Publications ─────────────────────────────────────────
    ws2 = wb.create_sheet("Publications")
    headers = ["#","Title","Journal","Year","Quartile",
               "Impact Factor","Citations","Indexing","Topic"]
    widths  = [5,  55,    35,      8,    10,      15,           10,        12,       20]

    for col, (h, w) in enumerate(zip(headers, widths), 1):
        ws2.column_dimensions[get_column_letter(col)].width = w
        c = ws2.cell(row=1, column=col, value=h)
    style_header_row(ws2, 1, len(headers))
    ws2.row_dimensions[1].height = 22

    for i, p in enumerate(pubs, 1):
        row = i + 1
        ws2.cell(row=row, column=1,  value=i)
        ws2.cell(row=row, column=2,  value=p.title)
        ws2.cell(row=row, column=3,  value=p.journal_name)
        ws2.cell(row=row, column=4,  value=p.year)
        ws2.cell(row=row, column=5,  value=p.quartile)
        ws2.cell(row=row, column=6,  value=p.impact_factor)
        ws2.cell(row=row, column=7,  value=p.citations_count)
        ws2.cell(row=row, column=8,  value=p.indexing)
        ws2.cell(row=row, column=9,  value=p.ml_topic)
        style_data_row(ws2, row, len(headers), alt=(i%2==0))

        # Color quartile cell
        q_colors = {"Q1":"E6F1FB","Q2":"EAF3DE","Q3":"FAEEDA","Q4":"FCEBEB"}
        qc = ws2.cell(row=row, column=5)
        if p.quartile in q_colors:
            qc.fill = PatternFill("solid", fgColor=q_colors[p.quartile])

    ws2.freeze_panes = "A2"
    ws2.auto_filter.ref = f"A1:I{len(pubs)+1}"

    # ── Sheet 3: Year-wise Summary ───────────────────────────────────
    ws3 = wb.create_sheet("Year-wise Summary")
    from collections import defaultdict
    year_data = defaultdict(lambda: {"count":0,"citations":0,"q1":0,"q2":0})
    for p in pubs:
        if p.year:
            year_data[p.year]["count"] += 1
            year_data[p.year]["citations"] += (p.citations_count or 0)
            if p.quartile == "Q1": year_data[p.year]["q1"] += 1
            if p.quartile == "Q2": year_data[p.year]["q2"] += 1

    ws3.column_dimensions["A"].width = 8
    ws3.column_dimensions["B"].width = 15
    ws3.column_dimensions["C"].width = 15
    ws3.column_dimensions["D"].width = 12
    ws3.column_dimensions["E"].width = 12

    yr_headers = ["Year","Publications","Citations","Q1 Papers","Q2 Papers"]
    for col, h in enumerate(yr_headers, 1):
        ws3.cell(row=1, column=col, value=h)
    style_header_row(ws3, 1, len(yr_headers))

    for i, (year, d) in enumerate(sorted(year_data.items(), reverse=True), 2):
        ws3.cell(row=i, column=1, value=year)
        ws3.cell(row=i, column=2, value=d["count"])
        ws3.cell(row=i, column=3, value=d["citations"])
        ws3.cell(row=i, column=4, value=d["q1"])
        ws3.cell(row=i, column=5, value=d["q2"])
        style_data_row(ws3, i, 5, alt=(i%2==0))

    # ── Sheet 4: NIRF Format ─────────────────────────────────────────
    ws4 = wb.create_sheet("NIRF Format")
    nirf_headers = ["S.No","Paper Title","Journal/Conference",
                    "ISSN","Year","Indexing","Impact Factor",
                    "Author Name","Co-authors"]
    nirf_widths  = [6,     55,              35,
                    15,    8,     12,        14,
                    25,    30]

    for col, (h, w) in enumerate(zip(nirf_headers, nirf_widths), 1):
        ws4.column_dimensions[get_column_letter(col)].width = w
        ws4.cell(row=1, column=col, value=h)
    style_header_row(ws4, 1, len(nirf_headers))

    for i, p in enumerate(pubs, 2):
        ws4.cell(row=i, column=1, value=i-1)
        ws4.cell(row=i, column=2, value=p.title)
        ws4.cell(row=i, column=3, value=p.journal_name)
        ws4.cell(row=i, column=4, value="")
        ws4.cell(row=i, column=5, value=p.year)
        ws4.cell(row=i, column=6, value=p.indexing)
        ws4.cell(row=i, column=7, value=p.impact_factor)
        ws4.cell(row=i, column=8, value=faculty.name)
        ws4.cell(row=i, column=9, value="")
        style_data_row(ws4, i, len(nirf_headers), alt=(i%2==0))

    # Save to buffer
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    fname = f"Research_Report_{faculty.name.replace(' ','_')}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={fname}"}
    )