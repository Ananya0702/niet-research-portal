from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Faculty, Publication, CitationYearly
from app.dependencies import get_current_faculty
from app.scraper.scholar_sync import fetch_scholar_data
from datetime import datetime

router = APIRouter()

# Track sync status per faculty
sync_status = {}

@router.post("/scholar")
def sync_google_scholar(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current=Depends(get_current_faculty)
):
    faculty_id = current["faculty_id"]

    faculty = db.query(Faculty).filter(
        Faculty.faculty_id == faculty_id
    ).first()

    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    if not faculty.google_scholar_id:
        raise HTTPException(
            status_code=400,
            detail="No Google Scholar ID set. Add it in My Profile → Scholar Setup tab."
        )

    # Check if already syncing
    if sync_status.get(faculty_id) == "running":
        raise HTTPException(
            status_code=400,
            detail="Sync already in progress. Please wait..."
        )

    # Run sync synchronously (so we can return results)
    sync_status[faculty_id] = "running"
    try:
        result = _do_sync(faculty, db)
        sync_status[faculty_id] = "done"
        return result
    except Exception as e:
        sync_status[faculty_id] = "error"
        raise HTTPException(status_code=500, detail=str(e))


def _do_sync(faculty, db):
    """Core sync logic — separated so it can be called directly."""
    from app.ml.classifier import process_publication, classify_publication_type

    # Fetch from Scholar
    data = fetch_scholar_data(
        faculty.google_scholar_id,
        mock=False
    )

    # Update faculty metrics
    if data["h_index"]:
        faculty.h_index = float(data["h_index"])
    if data["i10_index"]:
        faculty.i10_index = float(data["i10_index"])
    if data["citedby"]:
        old_cit = faculty.total_citations or 0
        faculty.total_citations = int(data["citedby"])
        # Update CitationYearly for current year
        if faculty.total_citations != old_cit:
            cur_year = datetime.now().year
            cy = db.query(CitationYearly).filter(
                CitationYearly.faculty_id == faculty.faculty_id,
                CitationYearly.year == cur_year
            ).first()
            if cy:
                cy.citations_count = faculty.total_citations
            else:
                db.add(CitationYearly(
                    faculty_id=faculty.faculty_id,
                    year=cur_year,
                    citations_count=faculty.total_citations
                ))

    new_count     = 0
    skipped_count = 0
    updated_count = 0

    # Get all existing publications for this faculty
    existing_pubs = db.query(Publication).filter(
        Publication.faculty_id == faculty.faculty_id
    ).all()

    # Build a set of existing titles (lowercase, first 60 chars) for fast lookup
    existing_titles = {
        p.title.strip().lower()[:60]: p
        for p in existing_pubs
    }

    for pub in data["publications"]:
        title = pub.get("title", "").strip()
        if not title:
            continue

        title_key = title.lower()[:60]

        # Check duplicate
        if title_key in existing_titles:
            # Update citation count if it increased
            existing = existing_titles[title_key]
            new_cit   = pub.get("citations_count", 0)
            if new_cit > (existing.citations_count or 0):
                existing.citations_count = new_cit
                updated_count += 1
            skipped_count += 1
            continue

        # Run ML on new paper
        ml_topic = None
        indexing  = "None"
        quartile  = "N/A"
        try:
            result   = process_publication(title, pub.get("journal_name", ""))
            ml_topic = result["ml_topic"]
            indexing = result["indexing"] if result["indexing"] != "None" else "None"
            quartile = result["quartile"] if result["quartile"] != "N/A"  else "N/A"
        except Exception as e:
            print(f"ML failed for '{title[:40]}': {e}")

        pub_type = classify_publication_type(title, pub.get("journal_name", ""))
        new_pub = Publication(
            faculty_id      = faculty.faculty_id,
            title           = title,
            journal_name    = pub.get("journal_name", "Unknown Journal"),
            doi             = pub.get("doi"),
            indexing        = indexing,
            quartile        = quartile,
            year            = pub.get("year", datetime.now().year),
            citations_count = pub.get("citations_count", 0),
            ml_topic        = ml_topic,
            impact_factor   = 0,
            publication_type = pub_type,
        )
        db.add(new_pub)

        # Add to existing titles so we don't add duplicates within same sync
        existing_titles[title_key] = new_pub
        new_count += 1

    # Update total publications count
    faculty.total_publications = len(existing_pubs) + new_count

    db.commit()

    # Log activity
    try:
        from app.routers.activity import log_activity
        log_activity(
            db, faculty.faculty_id,
            "scholar_synced",
            f"Synced Scholar — {new_count} new, "
            f"{updated_count} citations updated, "
            f"{skipped_count} already existed"
        )
    except Exception:
        pass

    return {
        "message":          "Sync complete",
        "new_publications": new_count,
        "already_existed":  skipped_count,
        "citations_updated":updated_count,
        "h_index":          faculty.h_index,
        "i10_index":        faculty.i10_index,
        "total_citations":  faculty.total_citations,
    }


@router.get("/scholar/status")
def get_sync_status(current=Depends(get_current_faculty)):
    status = sync_status.get(current["faculty_id"], "idle")
    return {"status": status}