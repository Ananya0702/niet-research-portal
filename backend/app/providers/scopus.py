"""Scopus provider — fetches author publications from the Elsevier Scopus Search API.

Requires an Elsevier API key (x-elsapikey). If no key is configured the provider
still validates the author id but every fetch raises ProviderError with a clear
message so the UI can show "API key not configured".

Config is read from environment / app config:
    SCOPUS_API_KEY   Elsevier API key (insttoken/leaky bucket)
    SCOPUS_INST_TOKEN Optional institutional token
"""

import os
import re

import requests

from .base import PublicationRecord, ProviderError, ResearchProvider, SyncResult

SEARCH_URL = "https://api.elsevier.com/content/search/scopus"
AUTHOR_URL = "https://api.elsevier.com/content/author/author_id"


def _get_api_key() -> str:
    return os.getenv("SCOPUS_API_KEY", "").strip()


class ScopusService(ResearchProvider):
    platform = "scopus"

    def validate_id(self, account_id: str) -> bool:
        # Scopus author ids are 8-15 digit numbers.
        return bool(re.fullmatch(r"\d{8,15}", (account_id or "").strip()))

    def fetch(self, account_id: str, **kwargs) -> SyncResult:
        api_key = _get_api_key()
        if not api_key:
            raise ProviderError(
                "Scopus API key not configured. Set SCOPUS_API_KEY to enable Scopus sync."
            )
        aid = (account_id or "").strip()
        headers = {"X-ELS-APIKey": api_key, "Accept": "application/json"}
        inst = os.getenv("SCOPUS_INST_TOKEN", "").strip()
        if inst:
            headers["X-ELS-Insttoken"] = inst

        # Verify the author id resolves first.
        ar = requests.get(f"{AUTHOR_URL}/{aid}", headers=headers, timeout=30)
        if ar.status_code in (401, 403):
            raise ProviderError("Scopus API rejected the API key (401/403).")
        if ar.status_code == 404:
            raise ProviderError(f"Scopus author not found: {aid}")
        if ar.status_code != 200:
            raise ProviderError(f"Scopus author lookup failed ({ar.status_code}).")

        # Paginate search results.
        records = []
        total = 0
        start = 0
        count = 25
        while True:
            params = {
                "query": f"AU-ID({aid})",
                "start": start,
                "count": count,
                "field": "dc:title,prism:publicationName,prism:coverDate,prism:doi,"
                         "dc:creator,dc:description,citedby-count,subtype,pii,eid",
                "sort": "-coverDate",
            }
            r = requests.get(SEARCH_URL, headers=headers, params=params, timeout=30)
            if r.status_code in (401, 403):
                raise ProviderError("Scopus API rejected the API key (401/403).")
            if r.status_code != 200:
                raise ProviderError(f"Scopus search failed ({r.status_code}).")
            body = r.json()
            entries = (body.get("search-results") or {}).get("entry") or []
            total = int((body.get("search-results") or {}).get("opensearch:totalResults") or 0)
            if not entries:
                break
            for e in entries:
                rec = self._record_from_entry(e)
                if rec and rec.title:
                    records.append(rec)
            start += count
            if start >= total or len(entries) < count:
                break

        return SyncResult(
            platform=self.platform,
            new=len(records),
            updated=0,
            skipped=max(0, total - len(records)),
            total_fetched=total,
            records=records,
        )

    @staticmethod
    def _record_from_entry(e: dict) -> PublicationRecord:
        title = (e.get("dc:title") or "").strip()
        journal = (e.get("prism:publicationName") or "").strip() or "Unknown Journal"
        year = None
        date = (e.get("prism:coverDate") or "").strip()
        m = re.match(r"(\d{4})", date)
        if m:
            year = int(m.group(1))
        doi = (e.get("prism:doi") or "").strip()
        authors = (e.get("dc:creator") or "").strip()
        citations = 0
        try:
            citations = int((e.get("citedby-count") or 0))
        except Exception:
            pass
        subtype = (e.get("subtype") or "").lower()
        if subtype.startswith("cp") or "conference" in subtype:
            ptype = "Conference"
        elif subtype.startswith("ar") or subtype.startswith("re"):
            ptype = "Journal"
        else:
            ptype = "Other"
        eid = (e.get("eid") or "").strip()
        external_url = f"https://www.scopus.com/record/display.url?eid={eid}" if eid else ""
        if doi and not external_url:
            external_url = f"https://doi.org/{doi}"
        return PublicationRecord(
            title=title,
            journal_name=journal,
            year=year,
            doi=doi,
            authors=authors,
            citation_count=citations,
            publication_type=ptype,
            abstract=(e.get("dc:description") or "")[:2000],
            source_id=eid or doi,
            external_url=external_url,
        )
