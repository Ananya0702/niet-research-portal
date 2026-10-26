"""Link imported patents to faculty accounts created after the spreadsheet import."""
import re
import unicodedata

from app.models import Department, Faculty, Patent, PatentFaculty


def _normal(value):
    value = unicodedata.normalize("NFKD", str(value or "").replace("�", " "))
    value = "".join(c for c in value if not unicodedata.combining(c)).lower()
    value = re.sub(r"^(dr|prof|professor)\.?\s+", "", value.strip())
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def _inventor_names(extra_data):
    if not isinstance(extra_data, dict):
        return []
    inventor_value = next(
        (value for key, value in extra_data.items()
         if _normal(key) in {"inventor", "inventors", "faculty", "faculty name", "author"}),
        "",
    )
    return [name.strip() for name in re.split(
        r"[;\n|]+|,(?=\s*(?:Dr\.?\s+)?[A-Z])", str(inventor_value or "")
    ) if name.strip()]


def link_saved_patents_to_new_faculty(db, faculty):
    """Attach uniquely matching saved inventor names within their original import scope."""
    normalized_name = _normal(faculty.name)
    if not normalized_name:
        return 0
    patents = db.query(Patent).filter(Patent.extra_data.isnot(None)).all()
    candidates = db.query(Faculty).filter(Faculty.is_active == True).all()
    departments = {dept.dept_id: dept for dept in db.query(Department).all()}
    linked = 0
    for patent in patents:
        if patent.faculty_id == faculty.faculty_id or any(
            link.faculty_id == faculty.faculty_id for link in patent.faculty_links
        ):
            continue
        if normalized_name not in {_normal(name) for name in _inventor_names(patent.extra_data)}:
            continue

        scope = patent.extra_data.get("_patent_link_scope", {}) if isinstance(patent.extra_data, dict) else {}
        level, scope_id = scope.get("level"), scope.get("id")
        if level == "department":
            allowed = faculty.dept_id == scope_id
        elif level == "school":
            allowed = faculty.school_id == scope_id
            if not allowed and faculty.dept_id:
                dept = db.query(Department).filter(Department.dept_id == faculty.dept_id).first()
                allowed = bool(dept and dept.school_id == scope_id)
        else:
            # Older imported records have no saved role scope; use the owning
            # department as the narrowest safe scope.
            owning_dept = next((dept for dept in departments.values() if dept.dept_code == patent.dept_code), None)
            allowed = bool(owning_dept and owning_dept.dept_id == faculty.dept_id)
        if not allowed:
            continue

        # Do not guess when another account in the same import scope has the same name.
        in_scope = []
        for candidate in candidates:
            if _normal(candidate.name) != normalized_name:
                continue
            if level == "department":
                same_scope = candidate.dept_id == scope_id
            elif level == "school":
                candidate_dept = departments.get(candidate.dept_id)
                same_scope = candidate.school_id == scope_id or bool(candidate_dept and candidate_dept.school_id == scope_id)
            else:
                same_scope = candidate.dept_id == faculty.dept_id
            if same_scope:
                in_scope.append(candidate)
        if len(in_scope) != 1:
            continue

        db.add(PatentFaculty(patent_id=patent.patent_id, faculty_id=faculty.faculty_id))
        linked += 1
    return linked
