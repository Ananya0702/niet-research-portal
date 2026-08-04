"""ORCID provider — fetches works from the public ORCID API.

Uses the unauthenticated endpoint https://pub.orcid.org/v3.0/{orcid}/works
which requires no token. ORCID does not provide citation counts or impact
factors; impact factors are resolved separately by journal-name lookup.
The public API rate-limits aggressively (503 "queue full"), so the fetcher
paces requests and retries with backoff.
"""

import re
import time

import requests

from .base import PublicationRecord, ProviderError, ResearchProvider, SyncResult

PUB_API = "https://pub.orcid.org/v3.0"
HEADERS = {"Accept": "application/json"}
RETRY_STATUS = {429, 500, 503}
MAX_RETRIES = 4
BASE_DELAY = 1.0  # seconds


def _strip_orcid(orcid: str) -> str:
    """Remove all separators for validation/dedup (keeps nothing but 0-9X)."""
    return re.sub(r"[^0-9Xx]", "", orcid or "").upper()


class ORCIDService(ResearchProvider):
    platform = "orcid"

    def validate_id(self, account_id: str) -> bool:
        # ORCID iDs are 15 digits + check digit (0-9 or X) in groups of 4.
        n = _strip_orcid(account_id)
        return len(n) == 16 and bool(re.fullmatch(r"[0-9]{15}[0-9X]", n))

    def fetch(self, account_id: str, **kwargs) -> SyncResult:
        orcid = (account_id or "").strip()
        if not orcid:
            raise ProviderError("Missing ORCID iD")
        # The ORCID API expects the canonical hyphenated form.
        if not _strip_orcid(orcid):
            raise ProviderError(f"Invalid ORCID iD: {orcid}")

        resp = self._get(f"{PUB_API}/{orcid}/works", params={})
        if resp.status_code == 404:
            raise ProviderError(f"ORCID profile not found: {orcid}")
        if resp.status_code != 200:
            raise ProviderError(f"ORCID API error {resp.status_code}")

        data = resp.json()
        group = data.get("group") or []
        records = []
        skipped = 0

        for g in group:
            try:
                rec = self._record_from_group(g, orcid)
                if rec and rec.title:
                    records.append(rec)
                else:
                    skipped += 1
            except Exception:
                skipped += 1

        return SyncResult(
            platform=self.platform,
            new=len(records),
            updated=0,
            skipped=skipped,
            total_fetched=len(group),
            records=records,
        )

    def _record_from_group(self, group: dict, orcid: str) -> PublicationRecord:
        """Extract the best summary from an ORCID work group."""
        summaries = group.get("work-summary") or []
        if not summaries:
            return None
        s = summaries[0]
        title_el = s.get("title") or {}
        title = (title_el.get("title") or {}).get("value") or ""
        title = title.strip()

        # journal / venue
        journal = ""
        jt = s.get("journal-title") or {}
        if jt.get("value"):
            journal = jt["value"].strip()
        elif s.get("type") == "journal-article":
            journal = "Unknown Journal"

        # publication year
        year = None
        date = s.get("publication-date") or {}
        yv = (date.get("year") or {}).get("value")
        if yv:
            try:
                year = int(yv)
            except Exception:
                year = None

        # DOI + other external ids
        doi = None
        external_url = ""
        ext_ids = (s.get("external-ids") or {})
        if isinstance(ext_ids, dict):
            ext_ids = ext_ids.get("external-id") or []
        for ext in ext_ids or []:
            if not isinstance(ext, dict):
                continue
            et = (ext.get("external-id-type") or "").lower()
            val = (ext.get("external-id-value") or "").strip()
            if et == "doi" and not doi:
                doi = re.sub(r"^https?://(dx\.)?doi\.org/", "", val)
            elif et == "orcid" and not external_url:
                external_url = val

        # publication type mapping
        ptype = self._map_type(s.get("type") or "")

        source_id = str(s.get("put-code") or "")
        if not external_url:
            external_url = f"https://orcid.org/{orcid}/print-view"
        if doi and not external_url.endswith(doi):
            external_url = f"https://doi.org/{doi}"

        return PublicationRecord(
            title=title,
            journal_name=journal,
            year=year,
            doi=doi,
            authors="",
            citation_count=0,
            publication_type=ptype,
            source_id=source_id,
            external_url=external_url,
        )

    @staticmethod
    def _map_type(t: str) -> str:
        t = (t or "").lower()
        if t in {"journal-article", "book", "book-chapter"}:
            return "Journal"
        if t in {"conference-paper", "conference-abstract", "conference-poster"}:
            return "Conference"
        return "Other"

    @staticmethod
    def _get(url: str, params: dict, headers: dict = None) -> requests.Response:
        """GET with pacing + retry/backoff on rate limits (429/503)."""
        hdrs = dict(HEADERS)
        if headers:
            hdrs.update(headers)
        last_resp = None
        for attempt in range(MAX_RETRIES):
            try:
                last_resp = requests.get(url, params=params, headers=hdrs, timeout=30)
                if last_resp.status_code not in RETRY_STATUS:
                    return last_resp
                if last_resp.status_code == 503 and "queue" not in last_resp.text.lower():
                    return last_resp  # not a rate-limit 503
            except requests.RequestException:
                last_resp = None
            delay = BASE_DELAY * (2 ** attempt)
            time.sleep(delay)
        return last_resp or requests.Response()
