from __future__ import annotations

from datetime import datetime
from typing import Any

from ..models import PublicSponsorDisclosure
from ..time_utils import now_utc


def _build_related_routes(disclosure: PublicSponsorDisclosure) -> dict[str, str]:
    routes: dict[str, str] = {
        "surface": disclosure.sponsored_surface,
        "transparency": "/transparency",
    }
    if disclosure.trust_report_slug:
        routes["trust_report"] = f"/transparency?report={disclosure.trust_report_slug}"
    if disclosure.archive_record_slug:
        routes["archive_record"] = f"/archive/{disclosure.archive_record_slug}"
    return routes


def _project_disclosure(disclosure: PublicSponsorDisclosure, reference_time: datetime | None = None) -> dict[str, Any]:
    payload = disclosure.to_dict(reference_time=reference_time)
    return {
        "id": payload["id"],
        "slug": payload["slug"],
        "sponsor_name": payload["sponsor_name"],
        "sponsor_type": payload["sponsor_type"],
        "sponsored_surface": payload["sponsored_surface"],
        "placement_type": payload["placement_type"],
        "disclosure_label": payload["disclosure_label"],
        "public_note": payload["public_note"],
        "disclosure_text": payload["disclosure_text"],
        "active_from": payload["active_from"],
        "active_until": payload["active_until"],
        "is_active": payload["is_active"],
        "is_currently_active": payload["is_currently_active"],
        "trust_report_slug": payload["trust_report_slug"],
        "archive_record_slug": payload["archive_record_slug"],
        "related_routes": _build_related_routes(disclosure),
        "created_at": payload["created_at"],
        "updated_at": payload["updated_at"],
    }


def list_public_sponsor_disclosures(
    *,
    surface: str | None = None,
    report_slug: str | None = None,
    archive_slug: str | None = None,
    include_inactive: bool = False,
    limit: int = 20,
):
    limit = max(1, min(limit, 100))
    query = PublicSponsorDisclosure.query
    if surface:
        query = query.filter_by(sponsored_surface=surface)
    if report_slug:
        query = query.filter_by(trust_report_slug=report_slug)
    if archive_slug:
        query = query.filter_by(archive_record_slug=archive_slug)

    reference_time = now_utc()
    disclosures = (
        query.order_by(PublicSponsorDisclosure.created_at.desc(), PublicSponsorDisclosure.id.desc())
        .limit(limit)
        .all()
    )

    if not include_inactive:
        disclosures = [row for row in disclosures if row.is_currently_active(reference_time=reference_time)]

    projected = [_project_disclosure(row, reference_time=reference_time) for row in disclosures]
    return {
        "disclosures": projected,
        "disclosure_state": "live" if projected else "none_published",
        "degraded_honesty": {
            "is_degraded": False,
            "reason": None,
            "fallback": "No active sponsor disclosures are published for this surface at this time."
            if not projected
            else None,
        },
    }


def get_public_sponsor_disclosure(disclosure_ref: str):
    disclosure = PublicSponsorDisclosure.query.filter_by(slug=disclosure_ref).first()
    if disclosure is None:
        try:
            disclosure_id = int(disclosure_ref)
        except (TypeError, ValueError):
            disclosure_id = None

        if disclosure_id is not None:
            disclosure = PublicSponsorDisclosure.query.get(disclosure_id)

    if disclosure is None:
        return None

    return {
        "disclosure": _project_disclosure(disclosure),
        "degraded_honesty": {
            "is_degraded": False,
            "reason": None,
            "fallback": None,
        },
    }
