from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.dependencies import get_current_faculty
from app.models import Patent, Faculty, Department, School, PatentFaculty
from app.routers.admin import get_current_admin
from pydantic import BaseModel
from typing import Optional, Any
from datetime import date
import re
import unicodedata

router = APIRouter()


class PatentImportRequest(BaseModel):
    rows: list[dict[str, Any]]


def _normal(value):
    value = unicodedata.normalize("NFKD", str(value or "").replace("�", " "))
    value = "".join(c for c in value if not unicodedata.combining(c)).lower()
    value = re.sub(r"^(dr|prof|professor)\.?\s+", "", value.strip())
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def _import_scope(db, current):
    user = db.query(Faculty).filter(Faculty.faculty_id == current.get("faculty_id")).first()
    if not user or user.role not in {"hod", "dean_rd"}:
        raise HTTPException(status_code=403, detail="Patent import is available to HODs and Deans")
    if user.role == "hod":
        if not user.dept_id:
            raise HTTPException(status_code=403, detail="No department is assigned to this HOD account")
        faculty = db.query(Faculty).filter(Faculty.dept_id == user.dept_id, Faculty.is_active == True).all()
    else:
        school_id = user.school_id
        if not school_id and user.dept_id:
            dept = db.query(Department).filter(Department.dept_id == user.dept_id).first()
            school_id = dept.school_id if dept else None
        if not school_id:
            raise HTTPException(status_code=403, detail="No school is assigned to this Dean account")
        faculty = db.query(Faculty).filter(Faculty.school_id == school_id, Faculty.is_active == True).all()
    return faculty


def _prepare_import(db, current, rows):
    scoped_faculty = _import_scope(db, current)
    faculty = db.query(Faculty).filter(Faculty.is_active == True).all()
    scoped_ids = {person.faculty_id for person in scoped_faculty}
    by_name = {}
    for person in faculty:
        by_name.setdefault(_normal(person.name), []).append(person)
    prepared, issues, warnings = [], [], []
    for index, raw in enumerate(rows, start=2):
        row = {str(k).strip(): v for k, v in raw.items() if k is not None and str(k).strip()}
        normalized = {_normal(k): v for k, v in row.items()}
        title = next((v for k, v in normalized.items() if k in {"title", "patent title", "invention title"}), None)
        inventor_text = next((v for k, v in normalized.items() if k in {"inventors", "inventor", "faculty", "faculty name", "author"}), "")
        year_value = next((v for k, v in normalized.items() if k in {"publish year", "publication year", "year"}), None)
        app_no = next((v for k, v in normalized.items() if k in {"patent application no", "application number", "application no", "patent number"}), None)
        status = next((v for k, v in normalized.items() if k == "status"), "Filed")
        department = next((v for k, v in normalized.items() if k in {"department", "dept", "department name"}), None)
        try:
            year = int(float(year_value))
        except (TypeError, ValueError):
            year = None
        row_issues, row_warnings, matched = [], [], []
        has_in_scope_inventor = False
        if not title or not str(title).strip(): row_issues.append("Missing title")
        if not year or year < 1900 or year > 2200: row_issues.append("Invalid or missing year")
        if not app_no or not str(app_no).strip(): row_issues.append("Missing application number")
        names = [n.strip() for n in re.split(r"[;\n|]+|,(?=\s*(?:Dr\.?\s+)?[A-Z])", str(inventor_text or "")) if n.strip()]
        if not names: row_issues.append("Missing inventor name")
        for name in names:
            matches = by_name.get(_normal(name), [])
            if len(matches) == 1:
                if matches[0].faculty_id not in {f.faculty_id for f in matched}: matched.append(matches[0])
                if matches[0].faculty_id in scoped_ids:
                    has_in_scope_inventor = True
            elif len(matches) > 1:
                row_warnings.append(f"Inventor '{name}' matches multiple faculty members and was not linked")
            else:
                row_warnings.append(f"Inventor '{name}' was not found among active NIET faculty")
        if matched and not has_in_scope_inventor:
            row_issues.append("At least one inventor must belong to your assigned department or school")
        elif not matched and not row_issues:
            row_issues.append("No inventor matched any active NIET faculty member")
        if row_issues:
            issues.append({"row": index, "errors": row_issues})
        if row_warnings:
            warnings.append({"row": index, "warnings": row_warnings})
        prepared.append({"row": row, "title": str(title or "").strip(), "year": year,
                         "application_number": str(app_no or "").strip() if app_no else None,
                         "status": str(status or "Filed").strip(), "department": str(department or "").strip(),
                         "faculty": matched, "inventors": str(inventor_text or "")})
    return prepared, issues, warnings


class PatentCreate(BaseModel):
    title: str
    department: Optional[str] = None
    school: Optional[str] = None
    ipr_type: str = "Patent"
    title_type: str = "National"

    application_number: Optional[str] = None
    publication_number: Optional[str] = None
    patent_number: Optional[str] = None

    status: str = "Filed"
    year: int

    filing_date: Optional[date] = None
    publication_date: Optional[date] = None
    grant_date: Optional[date] = None
    extra_data: Optional[dict[str, Any]] = None


@router.get("/")
def get_patents(
    db: Session = Depends(get_db),
    current=Depends(get_current_faculty)
):
    faculty_ids = [current["faculty_id"]]
    if current.get("role") in {"hod", "dean_rd"}:
        faculty_ids = [f.faculty_id for f in _import_scope(db, current)]
    patents = db.query(Patent).outerjoin(PatentFaculty).filter(or_(
        Patent.faculty_id.in_(faculty_ids), PatentFaculty.faculty_id.in_(faculty_ids)
    )).distinct().all()

    if current.get("role") in {"hod", "dean_rd"}:
        # Institute-managed IPR records are shared with management roles only.
        managed = db.query(Patent).all()
        visible_ids = {p.patent_id for p in patents}
        for patent in managed:
            if (isinstance(patent.extra_data, dict)
                    and patent.extra_data.get("_access_scope") == "management"
                    and patent.patent_id not in visible_ids):
                patents.append(patent)

    # Faculty must never receive institute-managed records, even if a future
    # workflow links one of those records to a faculty account.
    if current.get("role") == "faculty":
        patents = [p for p in patents if not (
            isinstance(p.extra_data, dict)
            and p.extra_data.get("_access_scope") == "management"
        )]

    return patents


def _patent_result(patent):
    return {
        "patent_id": patent.patent_id,
        "faculty_id": patent.faculty_id,
        "title": patent.title,
        "dept_code": patent.dept_code,
        "filing_date": patent.filing_date,
        "grant_date": patent.grant_date,
        "status": patent.status,
        "application_number": patent.application_number,
        "patent_number": patent.patent_number,
        "ipc_class": patent.ipc_class,
        "description": patent.description,
        "department": patent.department,
        "school": patent.school,
        "ipr_type": patent.ipr_type,
        "title_type": patent.title_type,
        "publication_number": patent.publication_number,
        "year": patent.year,
        "publication_date": patent.publication_date,
        "extra_data": patent.extra_data or {},
    }


def _duplicate_key(value):
    return re.sub(r"[^a-z0-9]+", "", unicodedata.normalize("NFKD", str(value or "")).lower())


@router.get("/admin/all")
def get_all_patents_for_admin(db: Session = Depends(get_db), current=Depends(get_current_admin)):
    patents = db.query(Patent).order_by(Patent.year.desc(), Patent.patent_id.desc()).all()
    managed = [p for p in patents if isinstance(p.extra_data, dict)
               and p.extra_data.get("_access_scope") == "management"]

    def identity_values(p):
        return {
            _duplicate_key(p.title),
            _duplicate_key(p.application_number),
            _duplicate_key(p.patent_number),
            _duplicate_key(p.publication_number),
        } - {""}

    managed_by_id = {p.patent_id: identity_values(p) for p in managed}
    results = []
    for patent in patents:
        record = _patent_result(patent)
        source = (patent.extra_data or {}).get("_access_scope") if isinstance(patent.extra_data, dict) else None
        record["record_source"] = "admin" if source == "management" else "faculty"
        record["duplicate_review"] = None
        if source != "management":
            candidate_values = identity_values(patent)
            matches = [managed_patent for managed_patent in managed
                       if candidate_values & managed_by_id[managed_patent.patent_id]]
            if matches:
                match = matches[0]
                record["duplicate_review"] = {
                    "status": "possible_duplicate",
                    "matched_patent_id": match.patent_id,
                    "matched_title": match.title,
                }
        results.append(record)
    return results


@router.post("/admin")
def add_admin_patent(p: PatentCreate, db: Session = Depends(get_db),
                     current=Depends(get_current_admin)):
    extra_data = {
        "_access_scope": "management",
        "_created_by_admin_id": current.get("admin_id"),
    }
    patent = Patent(
        faculty_id=None,
        title=p.title.strip(),
        department=p.department,
        school=p.school,
        ipr_type=p.ipr_type,
        title_type=p.title_type,
        application_number=p.application_number or p.patent_number,
        publication_number=p.publication_number,
        patent_number=p.patent_number,
        status=p.status,
        year=p.year,
        filing_date=p.filing_date,
        publication_date=p.publication_date,
        grant_date=p.grant_date,
        extra_data={**(p.extra_data or {}), **extra_data},
    )
    db.add(patent)
    db.commit()
    db.refresh(patent)
    return {"message": "Institute IPR record added. It is visible to Admins, Deans, and HODs.",
            "patent_id": patent.patent_id}


@router.post("/import/preview")
def preview_patent_import(payload: PatentImportRequest, db: Session = Depends(get_db),
                          current=Depends(get_current_faculty)):
    _, issues, warnings = _prepare_import(db, current, payload.rows)
    return {"total": len(payload.rows), "valid": len(payload.rows) - len(issues), "issues": issues, "warnings": warnings}


@router.post("/import")
def import_patents(payload: PatentImportRequest, db: Session = Depends(get_db),
                   current=Depends(get_current_faculty)):
    prepared, issues, _ = _prepare_import(db, current, payload.rows)
    if issues:
        raise HTTPException(status_code=422, detail={"message": "Resolve all row issues before importing", "issues": issues})
    imported, skipped = 0, 0
    for item in prepared:
        app_no = item["application_number"]
        existing = db.query(Patent).filter(Patent.application_number == app_no).first()
        if existing:
            skipped += 1
            continue
        primary = item["faculty"][0]
        dept = db.query(Department).filter(Department.dept_id == primary.dept_id).first() if primary.dept_id else None
        user = db.query(Faculty).filter(Faculty.faculty_id == current.get("faculty_id")).first()
        link_scope = {"level": "institute"}
        source_fields = dict(item["row"])
        source_fields["_patent_link_scope"] = link_scope
        patent = Patent(
            faculty_id=primary.faculty_id, title=item["title"], year=item["year"],
            application_number=app_no, patent_number=app_no, status=item["status"],
            department=item["department"] or (dept.dept_name if dept else None),
            dept_code=dept.dept_code if dept else None,
            school=dept.school.school_name if dept and dept.school else None,
            ipr_type="Patent", title_type="National", filing_date=None,
            extra_data=source_fields,
        )
        patent.faculty_links = [PatentFaculty(faculty_id=f.faculty_id) for f in item["faculty"]]
        db.add(patent)
        imported += 1
    db.commit()
    return {"message": f"Imported {imported} patents; skipped {skipped} existing application numbers", "imported": imported, "skipped": skipped}


@router.post("/")
def add_patent(
    p: PatentCreate,
    db: Session = Depends(get_db),
    current=Depends(get_current_faculty)
):

    faculty = db.query(Faculty).filter(
        Faculty.faculty_id == current["faculty_id"]
    ).first()

    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    dept = faculty.department.dept_code if faculty.department else "CSE"

    patent = Patent(
        faculty_id=current["faculty_id"],

        title=p.title,

        dept_code=dept,

        department=p.department,
        school=p.school,

        ipr_type=p.ipr_type,
        title_type=p.title_type,

        application_number=(p.application_number if p.application_number else f"APP-{p.year}-{current['faculty_id']}-{int(date.today().strftime('%d%m%Y'))}"),
        publication_number=p.publication_number,
        patent_number=p.patent_number,

        status=p.status,

        year=p.year,

        filing_date=p.filing_date,
        publication_date=p.publication_date,
        grant_date=p.grant_date,
    )

    db.add(patent)
    db.commit()
    db.refresh(patent)

    return {
        "message": "Patent added successfully",
        "patent_id": patent.patent_id
    }


@router.delete("/{patent_id}")
def delete_patent(
    patent_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_faculty)
):
    patent = db.query(Patent).filter(
        Patent.patent_id == patent_id,
        Patent.faculty_id == current["faculty_id"]
    ).first()

    if not patent:
        raise HTTPException(status_code=404, detail="Patent not found")

    db.delete(patent)
    db.commit()

    return {"message": "Patent deleted"}
