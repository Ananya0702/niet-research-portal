"""Provider registry: name -> service class lookup."""

from .base import ResearchProvider

_PROVIDERS = {}


def register(name: str, cls) -> None:
    _PROVIDERS[name] = cls


def get_provider(name: str) -> ResearchProvider:
    if name not in _PROVIDERS:
        raise KeyError(f"Unknown research platform: {name!r}. Supported: {list(_PROVIDERS)}")
    return _PROVIDERS[name]()


def list_providers():
    return dict(_PROVIDERS)
