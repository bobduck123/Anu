from __future__ import annotations

from datetime import UTC, datetime


def now_utc() -> datetime:
    """
    Return a UTC timestamp as naive datetime for legacy DB compatibility.
    """
    return datetime.now(UTC).replace(tzinfo=None)
