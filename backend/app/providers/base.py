"""Base class + shared data models for research platform providers."""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class PublicationRecord:
    """Normalized publication fetched from a research platform."""
    title: str
    journal_name: str = ""
    year: Optional[int] = None
    doi: Optional[str] = None
    authors: str = ""
    citation_count: int = 0
    publication_type: str = ""          # "Journal" | "Conference" | "Other"
    abstract: str = ""
    publisher: str = ""
    volume: str = ""
    issue: str = ""
    pages: str = ""
    source_id: Optional[str] = None     # provider-native id (orcid put-code, scopus eid, ...)
    external_url: str = ""


@dataclass
class SyncResult:
    """Outcome of a platform sync for one faculty member."""
    platform: str
    new: int = 0
    updated: int = 0
    skipped: int = 0
    total_fetched: int = 0
    error: Optional[str] = None
    records: List[PublicationRecord] = field(default_factory=list)


class ResearchProvider:
    """Interface every platform service must implement."""

    platform = "base"

    def fetch(self, account_id: str, **kwargs) -> SyncResult:
        """Fetch a faculty member's publications from the platform.

        Args:
            account_id: provider-native account id (scholar id / orcid id / scopus id).
        Raises:
            ProviderError: when the platform is unreachable or rejects the id.
        """
        raise NotImplementedError

    def validate_id(self, account_id: str) -> bool:
        """Sanity-check that an account id looks structurally valid."""
        return bool(account_id and account_id.strip())


class ProviderError(Exception):
    """Raised when a research platform call fails."""
