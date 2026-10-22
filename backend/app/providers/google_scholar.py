"""Google Scholar provider — wraps the existing scraper.scholar_sync module."""

from datetime import datetime

from .base import PublicationRecord, ResearchProvider, SyncResult
from ..scraper import scholar_sync


class GoogleScholarService(ResearchProvider):
    platform = "google_scholar"

    def validate_id(self, account_id: str) -> bool:
        aid = scholar_sync.extract_scholar_id(account_id)
        return len(aid) == 12

    def fetch(self, account_id: str, mock: bool = False, **kwargs) -> SyncResult:
        aid = scholar_sync.extract_scholar_id(account_id)
        raw = scholar_sync.fetch_scholar_data(aid, mock=mock, **kwargs)
        pubs = raw.get("publications", [])
        records = []
        for idx, p in enumerate(pubs):
            records.append(PublicationRecord(
                title=p.get("title") or "",
                journal_name=p.get("journal_name") or "Unknown Journal",
                year=p.get("year") or datetime.now().year,
                doi=p.get("doi"),
                authors=p.get("authors") or "",
                citation_count=p.get("citations_count") or 0,
                publication_type=p.get("publication_type") or "",
                source_id=p.get("source_id") or f"gs_{idx+1}",
                external_url=f"https://scholar.google.com/citations?view_op=list_works&hl=en&user={aid}",
            ))
        return SyncResult(
            platform=self.platform,
            new=len(records),
            updated=0,
            skipped=0,
            total_fetched=len(records),
            records=records,
            raw_metrics={
                "h_index": raw.get("h_index", 0),
                "i10_index": raw.get("i10_index", 0),
                "citedby": raw.get("citedby", 0),
            },
        )
