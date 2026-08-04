"""Shared SQLAlchemy helper for filtering publications by research platform.

A publication can be available on multiple platforms (see publication_sources),
so filtering matches the provenance table as well as the legacy
publications.source_platform column.
"""

from sqlalchemy import or_

from .models import Publication, PublicationSource

SUPPORTED_SOURCES = ("all", "manual", "google_scholar", "orcid", "scopus")


def apply_source_filter(db, query, source):
    """Apply a platform filter to a Publication query.

    "manual" matches publications with no provenance row and whose legacy
    source_platform is NULL/empty (i.e. entered directly in the portal).
    """
    if not source or source == "all":
        return query
    sub = db.query(PublicationSource.pub_id).filter(
        PublicationSource.platform == source
    ).subquery()
    if source == "manual":
        return query.outerjoin(sub, sub.c.pub_id == Publication.pub_id).filter(
            sub.c.pub_id.is_(None),
            or_(Publication.source_platform.is_(None),
                Publication.source_platform == "",
                Publication.source_platform == "manual"),
        )
    return query.outerjoin(sub, sub.c.pub_id == Publication.pub_id).filter(
        or_(sub.c.pub_id.isnot(None), Publication.source_platform == source)
    )


def pub_sources_by_pub(db, pub_ids):
    """Return {pub_id: [ {platform, source_id, external_url, sync_timestamp} ]}."""
    if not pub_ids:
        return {}
    rows = db.query(PublicationSource).filter(
        PublicationSource.pub_id.in_(pub_ids)
    ).all()
    out = {}
    for r in rows:
        out.setdefault(r.pub_id, []).append({
            "platform": r.platform,
            "source_id": r.source_id or "",
            "external_url": r.external_url or "",
            "sync_timestamp": r.sync_timestamp.isoformat() if r.sync_timestamp else "",
        })
    return out
