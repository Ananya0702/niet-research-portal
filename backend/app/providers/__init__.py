"""Research platform providers.

Provider-based architecture: each research platform (Google Scholar, ORCID,
Scopus, ...) is an independent service implementing the same interface so new
platforms (Web of Science, OpenAlex, CrossRef, Dimensions, Semantic Scholar)
can be added without touching existing code.
"""
from .base import ResearchProvider, PublicationRecord, SyncResult, ProviderError
from .registry import get_provider, list_providers, register

from .google_scholar import GoogleScholarService
from .orcid import ORCIDService
from .scopus import ScopusService

register("google_scholar", GoogleScholarService)
register("orcid", ORCIDService)
register("scopus", ScopusService)

__all__ = [
    "ResearchProvider",
    "PublicationRecord",
    "SyncResult",
    "ProviderError",
    "get_provider",
    "list_providers",
    "register",
]
