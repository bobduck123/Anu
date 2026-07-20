from __future__ import annotations

import re
from typing import Any

from .presence_service import PresenceValidationError
from .presence_social_service import clean_text


_EMAIL_RE = re.compile(r"[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}")
_PHONE_RE = re.compile(r"(?:\+?\d[\s().-]*){8,}")
_URL_RE = re.compile(r"https?://|www\.|\.com\b|\.net\b|\.org\b|\.au\b", re.IGNORECASE)
_BOOKING_RE = re.compile(
    r"\b(book|booking|appointments?|schedule|calendar|consultation|quote|rates?|price list|availability|dm me|contact me)\b",
    re.IGNORECASE,
)
_BUSINESS_RE = re.compile(
    r"\b(services?|hire me|commissions?|portfolio|client work|shop|store|subscribe|packages?|offerings?|enquir(?:y|ies))\b",
    re.IGNORECASE,
)


def detect_commercial_links(*values: Any) -> bool:
    text = _joined(values)
    return bool(_URL_RE.search(text))


def detect_booking_contact_attempts(*values: Any) -> bool:
    text = _joined(values)
    return bool(_EMAIL_RE.search(text) or _PHONE_RE.search(text) or _BOOKING_RE.search(text))


def detect_observer_business_profile_attempt(*values: Any) -> bool:
    text = _joined(values)
    return detect_commercial_links(text) or detect_booking_contact_attempts(text) or bool(_BUSINESS_RE.search(text))


def upgrade_prompt_payload(*, reason: str = "observer_business_profile_attempt") -> dict[str, Any]:
    return {
        "reason": reason,
        "upgrade_required": True,
        "upgrade_target": "presence_room",
        "message": "Observer Masks are personal and social. To publish services, booking details, portfolios, commercial links, or business contact points, create or upgrade to a Presence Room.",
        "allowed_actions": ["create_presence_room", "link_existing_room"],
    }


def validate_observer_no_self_promotion(*values: Any, field: str = "content") -> None:
    if detect_observer_business_profile_attempt(*values):
        raise PresenceValidationError(
            f"{field} cannot include commercial links, booking/contact prompts, services, or portfolio-style business positioning.",
            details=upgrade_prompt_payload(),
        )


def _joined(values: tuple[Any, ...]) -> str:
    parts: list[str] = []
    for value in values:
        if value is None:
            continue
        if isinstance(value, dict):
            parts.extend(str(v) for v in value.values() if isinstance(v, (str, int, float)))
        elif isinstance(value, list):
            parts.extend(str(item) for item in value if isinstance(item, (str, int, float)))
        else:
            parts.append(str(value))
    return clean_text(" ".join(parts), 4000) or ""
