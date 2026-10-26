from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db, SessionLocal
from app.models import Faculty, Publication, PublicationSource, CitationYearly
from app.dependencies import get_current_faculty
from app.providers import get_provider, ProviderError
from datetime import datetime

router = APIRouter()

# Per-faculty, per-platform sync status
sync_status = {}

# Faculty column that holds the account id for each platform
PLATFORM_ID_FIELD = {
    "google_scholar": "google_scholar_id",
    "orcid":          "orcid_id",
    "scopus":         "scopus_author_id",
}

SUPPORTED_PLATFORMS = list(PLATFORM_ID_FIELD)


def _current_user_id(current):
    return current["faculty_id"]


PLATFORM_NAMES = {
    "google_scholar": "Google Scholar",
    "orcid": "ORCID",
    "scopus": "Scopus",
}


def _check_status(faculty_id: str, platform: str):
    status_key = f"{faculty_id}:{platform}"
    state = sync_status.get(status_key)
    if state == "running" or (isinstance(state, dict) and state.get("status") == "running"):
        raise HTTPException(status_code=400, detail="Sync already in progress. Please wait...")


@router.post("/scholar", status_code=202)
def sync_google_scholar(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current=Depends(get_current_faculty)
):
    return _schedule_sync("google_scholar", db, current, background_tasks)


@router.post("/{platform}")
def sync_platform(
    platform: str,
    db: Session = Depends(get_db),
    current=Depends(get_current_faculty)
):
    if platform not in SUPPORTED_PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform}")
    # Preserve the existing synchronous flow for ORCID and Scopus.
    return _run_sync(platform, db, current)


@router.get("/{platform}/status")
def get_sync_status(platform: str, db: Session = Depends(get_db), current=Depends(get_current_faculty)):
    if platform not in SUPPORTED_PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform}")
    faculty = db.query(Faculty).filter(Faculty.faculty_id == _current_user_id(current)).first()
    state = sync_status.get(f"{_current_user_id(current)}:{platform}")
    if isinstance(state, dict):
        return state
    return {"status": getattr(faculty, f"{platform}_sync_status", "idle") if faculty else "idle"}


def _schedule_sync(platform: str, db: Session, current: dict, background_tasks: BackgroundTasks):
    """Start one shared asynchronous sync job for any dashboard entry point."""
    faculty_id = _current_user_id(current)
    faculty = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    id_field = PLATFORM_ID_FIELD[platform]
    account_id = getattr(faculty, id_field, None)
    if not account_id:
        raise HTTPException(
            status_code=400,
            detail=f"No {PLATFORM_NAMES[platform]} ID set. Add it in My Profile → Academic Identity.",
        )

    _check_status(faculty_id, platform)

    status_key = f"{faculty_id}:{platform}"
    sync_status[status_key] = {"status": "running", "message": f"{PLATFORM_NAMES[platform]} sync started"}
    setattr(faculty, f"{platform}_sync_status", "running")
    db.commit()
    background_tasks.add_task(_run_background_sync, faculty_id, platform)
    return {"status": "running", "message": f"{PLATFORM_NAMES[platform]} sync started"}


def _run_sync(platform: str, db: Session, current: dict):
    """Synchronous flow retained for ORCID and Scopus profile actions."""
    faculty_id = _current_user_id(current)
    faculty = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    account_id = getattr(faculty, PLATFORM_ID_FIELD[platform], None)
    if not account_id:
        raise HTTPException(status_code=400, detail=f"No {PLATFORM_NAMES[platform]} ID set")
    _check_status(faculty_id, platform)
    status_key = f"{faculty_id}:{platform}"
    sync_status[status_key] = {"status": "running"}
    try:
        result = _do_sync(platform, faculty, db)
        sync_status[status_key] = {"status": "done", "result": result}
        return result
    except ProviderError as e:
        sync_status[status_key] = {"status": "error", "error": str(e)}
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        sync_status[status_key] = {"status": "error", "error": str(e)}
        raise HTTPException(status_code=500, detail=str(e))


def schedule_admin_sync(faculty_id: int, platform: str, db: Session, background_tasks: BackgroundTasks):
    """Shared scheduling entry point used by the Admin faculty table."""
    faculty = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    id_field = PLATFORM_ID_FIELD.get(platform)
    if not id_field:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform}")
    if not getattr(faculty, id_field, None):
        raise HTTPException(status_code=400, detail=f"No {PLATFORM_NAMES[platform]} ID set for this faculty")
    _check_status(faculty_id, platform)
    sync_status[f"{faculty_id}:{platform}"] = {"status": "running", "message": f"{PLATFORM_NAMES[platform]} sync started"}
    setattr(faculty, f"{platform}_sync_status", "running")
    db.commit()
    background_tasks.add_task(_run_background_sync, faculty_id, platform)
    return {"status": "running", "message": f"{PLATFORM_NAMES[platform]} sync started"}


def _run_background_sync(faculty_id: int, platform: str):
    status_key = f"{faculty_id}:{platform}"
    db = SessionLocal()
    try:
        faculty = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
        if not faculty:
            raise ValueError("Faculty not found")
        result = _do_sync(platform, faculty, db)
        sync_status[status_key] = {"status": "done", "result": result}
    except Exception as e:
        db.rollback()
        faculty = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
        if faculty:
            setattr(faculty, f"{platform}_sync_status", "error")
            db.commit()
        sync_status[status_key] = {"status": "error", "error": str(e)}
    finally:
        db.close()


def _do_sync(platform: str, faculty, db: Session) -> dict:
    """Generic per-platform sync with merge/dedup."""
    from app.ml.classifier import process_publication, classify_publication_type

    provider = get_provider(platform)
    id_field = PLATFORM_ID_FIELD[platform]
    account_id = getattr(faculty, id_field)

    # Mark running in DB
    status_attr = f"{platform}_sync_status"
    setattr(faculty, status_attr, "running")
    db.commit()

    try:
        author_name = getattr(faculty, "name", "") or ""
        orcid_id = getattr(faculty, "orcid_id", "") or ""
        result = provider.fetch(account_id, author_name=author_name, orcid_id=orcid_id)
    except Exception:
        setattr(faculty, status_attr, "error")
        db.commit()
        raise

    now = datetime.now()
    records = result.records

    # ── Index faculty's existing pubs by DOI + title ──
    existing_pubs = db.query(Publication).filter(
        Publication.faculty_id == faculty.faculty_id
    ).all()

    by_doi = {}
    by_title = {}
    for p in existing_pubs:
        if p.doi:
            by_doi.setdefault(_norm_doi(p.doi), []).append(p)
        if p.title:
            by_title.setdefault(p.title.strip().lower()[:80], []).append(p)

    # Load existing source rows: pub_id -> {platform: PublicationSource}
    existing_sources = db.query(PublicationSource).join(
        Publication, PublicationSource.pub_id == Publication.pub_id
    ).filter(Publication.faculty_id == faculty.faculty_id).all()
    src_by_pub = {}
    for s in existing_sources:
        src_by_pub.setdefault(s.pub_id, {})[s.platform] = s

    new_count = 0
    updated_count = 0
    skipped_count = 0

    for rec in records:
        if not rec.title:
            skipped_count += 1
            continue

        existing = _find_existing(by_doi, by_title, rec, platform, src_by_pub)

        if existing is not None:
            updated_count += _merge_into(
                db, existing, src_by_pub, rec, platform, now
            )
            # Update in-memory indexes so in-batch dupes also match
            if existing.doi:
                by_doi.setdefault(_norm_doi(existing.doi), []).append(existing)
            if existing.title:
                by_title.setdefault(existing.title.strip().lower()[:80], []).append(existing)
            skipped_count += 1
            continue

        # ── New publication ──
        ml_topic = None
        indexing = "None"
        quartile = "N/A"
        try:
            ml_result = process_publication(rec.title, rec.journal_name)
            ml_topic = ml_result.get("ml_topic")
            indexing = ml_result.get("indexing") or "None"
            quartile = ml_result.get("quartile") or "N/A"
        except Exception as e:
            print(f"ML failed for '{rec.title[:40]}': {e}")

        pub_type = rec.publication_type or classify_publication_type(rec.title, rec.journal_name)

        new_pub = Publication(
            faculty_id       = faculty.faculty_id,
            title            = rec.title,
            journal_name     = rec.journal_name or "Unknown Journal",
            doi              = rec.doi,
            indexing         = indexing,
            quartile         = quartile,
            year             = rec.year or datetime.now().year,
            citations_count  = rec.citation_count or 0,
            ml_topic         = ml_topic,
            impact_factor    = 0,
            publication_type = pub_type,
            authors          = rec.authors or None,
            source_platform  = platform,
            source_id        = rec.source_id,
            external_url     = rec.external_url or None,
            sync_timestamp   = now,
        )
        db.add(new_pub)
        db.flush()  # assign pub_id

        src_by_pub.setdefault(new_pub.pub_id, {})[platform] = PublicationSource(
            pub_id=new_pub.pub_id,
            platform=platform,
            source_id=rec.source_id,
            external_url=rec.external_url or None,
            sync_timestamp=now,
        )
        db.add(src_by_pub[new_pub.pub_id][platform])

        # add to indexes to dedupe within batch
        by_title.setdefault(rec.title.strip().lower()[:80], []).append(new_pub)
        if rec.doi:
            by_doi.setdefault(_norm_doi(rec.doi), []).append(new_pub)

        new_count += 1

    # ── Scholar-specific metrics ──
    if platform == "google_scholar":
        _apply_scholar_metrics(faculty, db, result)

    # Update connection + sync timestamps
    setattr(faculty, f"{platform}_connected", True)
    setattr(faculty, f"{platform}_sync_status", "done")
    setattr(faculty, f"last_{platform}_sync", now)

    all_pubs = db.query(Publication).filter(
        Publication.faculty_id == faculty.faculty_id
    ).count()
    faculty.total_publications = all_pubs

    db.commit()

    try:
        from app.routers.activity import log_activity
        log_activity(
            db, faculty.faculty_id,
            f"{platform}_synced",
            f"Synced {platform.replace('_', ' ').title()} — {new_count} new, "
            f"{updated_count} updated, {skipped_count} already existed",
        )
    except Exception:
        pass

    return {
        "message":           "Sync complete",
        "platform":          platform,
        "new_publications":  new_count,
        "already_existed":   skipped_count,
        "citations_updated": updated_count,
        "total_fetched":     result.total_fetched,
        "total_publications": faculty.total_publications,
        "h_index":           faculty.h_index or 0,
        "total_citations":   faculty.total_citations or 0,
    }


def _apply_scholar_metrics(faculty, db, result):
    if not result.records:
        return
    raw = getattr(result, "raw_metrics", {})
    if not raw:
        from app.scraper.scholar_sync import fetch_scholar_data
        try:
            author_name = getattr(faculty, "name", "") or ""
            orcid_id = getattr(faculty, "orcid_id", "") or ""
            raw = fetch_scholar_data(
                faculty.google_scholar_id,
                mock=False,
                author_name=author_name,
                orcid_id=orcid_id,
            )
        except Exception as e:
            print(f"[Scholar] metrics fetch failed: {e}")
            raw = {}

    try:
        if raw.get("h_index"):
            faculty.h_index = float(raw["h_index"])
        if raw.get("i10_index"):
            faculty.i10_index = float(raw["i10_index"])
        if raw.get("citedby"):
            old_cit = faculty.total_citations or 0
            faculty.total_citations = int(raw["citedby"])
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
                        citations_count=faculty.total_citations,
                    ))
    except Exception as e:
        print(f"[Scholar] metrics update failed: {e}")


def _norm_doi(doi: str) -> str:
    if not doi:
        return ""
    return doi.strip().lower().replace("https://doi.org/", "").replace("http://dx.doi.org/", "")


def _pub_has_platform(p, platform, src_by_pub):
    """True if this pub already carries provenance for the given platform."""
    if p.source_platform == platform:
        return True
    return platform in (src_by_pub.get(p.pub_id) or {})


def _find_existing(by_doi, by_title, rec, platform, src_by_pub):
    """Merge priority: DOI → normalized title (→ year check).

    Only matches publications that already belong to the same platform, so
    each platform's data stays in its own separate publication records.
    """
    if rec.doi:
        matches = [m for m in (by_doi.get(_norm_doi(rec.doi)) or [])
                   if _pub_has_platform(m, platform, src_by_pub)]
        for m in matches:
            if _title_similar(m.title, rec.title):
                return m
        if matches:
            return matches[0]

    key = rec.title.strip().lower()[:80]
    matches = [m for m in (by_title.get(key) or [])
               if _pub_has_platform(m, platform, src_by_pub)]
    if not matches:
        return None
    # prefer a same-year title match
    for m in matches:
        if m.year == rec.year:
            return m
    return matches[0]


def _title_similar(a: str, b: str) -> bool:
    a = (a or "").strip().lower()
    b = (b or "").strip().lower()
    return a == b or (a[:60] == b[:60])


def _merge_into(db, pub, src_by_pub, rec, platform, now) -> int:
    """Update an existing pub with data from another platform. Returns 1 if updated."""
    updated = 0

    if rec.citation_count and rec.citation_count > (pub.citations_count or 0):
        pub.citations_count = rec.citation_count
        updated = 1
    if rec.doi and not pub.doi:
        pub.doi = rec.doi
        updated = 1
    if rec.authors and not pub.authors:
        pub.authors = rec.authors
        updated = 1
    if rec.year and not pub.year:
        pub.year = rec.year
        updated = 1

    # Record this platform on the pub's provenance
    srcs = src_by_pub.setdefault(pub.pub_id, {})
    if platform in srcs:
        srcs[platform].external_url = rec.external_url or srcs[platform].external_url
        srcs[platform].source_id = rec.source_id or srcs[platform].source_id
        srcs[platform].sync_timestamp = now
    else:
        srcs[platform] = PublicationSource(
            pub_id=pub.pub_id,
            platform=platform,
            source_id=rec.source_id,
            external_url=rec.external_url or None,
            sync_timestamp=now,
        )
        db.add(srcs[platform])
        updated = 1

    # Keep primary source_platform meaningful
    if not pub.source_platform or pub.source_platform == "manual":
        pub.source_platform = platform
        pub.source_id = rec.source_id or pub.source_id
        pub.external_url = rec.external_url or pub.external_url
        pub.sync_timestamp = now

    return updated
