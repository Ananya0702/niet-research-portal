"""Shared SQLAlchemy helper for filtering publications by research platform.

A publication can be available on multiple platforms (see publication_sources),
so filtering matches the provenance table as well as the legacy
publications.source_platform column.
"""

import re
from datetime import datetime

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


def _norm_doi(doi):
    """Normalize a DOI for duplicate detection."""
    if not doi:
        return ""
    d = doi.strip().lower()
    for prefix in ("https://doi.org/", "http://doi.org/",
                   "https://dx.doi.org/", "http://dx.doi.org/", "doi:"):
        if d.startswith(prefix):
            d = d[len(prefix):]
            break
    return d.strip().rstrip(").,")


def _norm_title(title):
    """Normalize a title for duplicate detection."""
    return re.sub(r"\s+", " ", (title or "").strip().lower())


def _norm_authors(authors):
    """Lowercase, split, and dedupe author names for fallback matching."""
    if not authors:
        return []
    out = []
    for part in re.split(r"[;,]| and ", authors):
        name = re.sub(r"\s+", " ", part.strip().lower())
        if name:
            out.append(name)
    return out


def merge_source_publications(db, query):
    """Merge the Google Scholar + ORCID union of publications into one list.

    Publications are fetched under both platform filters, merged, then
    de-duplicated using reliable identities. Two publications are the same
    when they share ANY of:

      1. normalized DOI
      2. a source/external ID (ORCID work id or publication_sources.source_id)
      3. exact normalized title
      4. normalized title + year + authors (fallback)

    For each duplicate group a single representative record is kept: the one
    carrying the richest data (a real published year instead of the
    sync-default current year, a real quartile instead of N/A, and the most
    citations). The underlying data is never modified.
    """
    gs_query = apply_source_filter(db, query, "google_scholar")
    or_query = apply_source_filter(db, query, "orcid")

    all_pubs = []
    seen_ids = set()
    for q in (gs_query, or_query):
        for p in q.all():
            if p.pub_id not in seen_ids:
                seen_ids.add(p.pub_id)
                all_pubs.append(p)

    # source_ids exposed through the provenance table
    provenance = pub_sources_by_pub(db, list(seen_ids))

    def identity_keys(p):
        keys = []
        doi = _norm_doi(p.doi)
        if doi:
            keys.append(("doi", doi))
        sid = (p.source_id or "").strip()
        if sid:
            keys.append(("src", sid))
        for s in provenance.get(p.pub_id, []):
            if s.get("source_id"):
                keys.append(("src", s["source_id"]))
        title = _norm_title(p.title)
        if title:
            keys.append(("title", title))
            keys.append(("tya", title, p.year or 0,
                         tuple(sorted(set(_norm_authors(p.authors)))[:3])))
        return keys

    parent = {p.pub_id: p.pub_id for p in all_pubs}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    key_owner = {}

    for p in all_pubs:
        keys = identity_keys(p)
        if not keys:
            continue
        owner = None
        for key in keys:
            if key in key_owner:
                owner = key_owner[key] if owner is None else owner
                union(owner, key_owner[key])
            else:
                key_owner[key] = p.pub_id
                owner = p.pub_id if owner is None else owner
                if owner != p.pub_id:
                    union(owner, p.pub_id)
        union(p.pub_id, owner)

    def record_score(p):
        score = 0
        if p.year and p.year != datetime.now().year:
            score += 4
        elif p.year:
            score += 1
        if p.quartile and p.quartile not in ("", "N/A"):
            score += 3
        if p.title:
            score += 1
        score += min((p.citations_count or 0) / 100, 3)
        return score

    representative = {}
    for p in all_pubs:
        root = find(p.pub_id)
        cur = representative.get(root)
        if cur is None or record_score(p) > record_score(cur):
            representative[root] = p

    return list(representative.values())


def unique_publication_count(db, query):
    """Count the unique union of Google Scholar + ORCID publications."""
    return len(merge_source_publications(db, query))
