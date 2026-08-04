"""Google Scholar provider — wraps the existing scraper.scholar_sync module."""

from datetime import datetime

from .base import PublicationRecord, ResearchProvider, SyncResult
from ..scraper import scholar_sync


class GoogleScholarService(ResearchProvider):
    platform = "google_scholar"

    def validate_id(self, account_id: str) -> bool:
        # Google Scholar user ids are 12-char alphanumeric strings.
        aid = (account_id or "").strip()
        return len(aid) == 12 and aid.isalnum()

    def fetch(self, account_id: str, mock: bool = False, **kwargs) -> SyncResult:
        raw = scholar_sync.fetch_scholar_data(account_id, mock=mock)
        pubs = raw.get("publications", [])
        records = []
        for p in pubs:
            records.append(PublicationRecord(
                title=p.get("title") or "",
                journal_name=p.get("journal_name") or "Unknown Journal",
                year=p.get("year") or datetime.now().year,
                doi=p.get("doi"),
                authors=p.get("authors") or "",
                citation_count=p.get("citations_count") or 0,
                publication_type=p.get("publication_type") or "",
                source_id=p.get("source_id"),
                external_url=f"https://scholar.google.com/citations?view_op=list_works&hl=en&user={account_id}",
            ))
        return SyncResult(
            platform=self.platform,
            new=len(records),
            updated=0,
            skipped=0,
            total_fetched=len(records),
            records=records,
        )
