from __future__ import annotations

from flask import Blueprint, current_app, request

from ..extensions import db, limiter
from ..schemas import (
    PublicSponsorDisclosureDetailPayloadSchema,
    PublicSponsorDisclosureListPayloadSchema,
)
from ..services.sponsor_disclosure_service import (
    get_public_sponsor_disclosure,
    list_public_sponsor_disclosures,
)
from .utils import error, ok

public_transparency_bp = Blueprint("public_transparency", __name__, url_prefix="/public/transparency")

SPONSOR_DISCLOSURE_LIST_SCHEMA = PublicSponsorDisclosureListPayloadSchema()
SPONSOR_DISCLOSURE_DETAIL_SCHEMA = PublicSponsorDisclosureDetailPayloadSchema()


def _as_bool(raw_value: str | None) -> bool:
    if raw_value is None:
        return False
    return raw_value.strip().lower() in {"1", "true", "yes", "on"}


@public_transparency_bp.route("/sponsor-disclosures", methods=["GET"])
@limiter.limit("120 per hour")
def list_sponsor_disclosures_route():
    surface = request.args.get("surface")
    report_slug = request.args.get("report")
    archive_slug = request.args.get("archive")
    include_inactive = _as_bool(request.args.get("include_inactive"))
    raw_limit = request.args.get("limit", "20")

    try:
        limit = int(raw_limit)
    except (TypeError, ValueError):
        return error("bad_request", "limit must be an integer", 400)

    try:
        payload = list_public_sponsor_disclosures(
            surface=surface,
            report_slug=report_slug,
            archive_slug=archive_slug,
            include_inactive=include_inactive,
            limit=limit,
        )
        return ok(SPONSOR_DISCLOSURE_LIST_SCHEMA.dump(payload))
    except Exception:
        current_app.logger.exception("Public sponsor disclosure list failed")
        db.session.rollback()
        return error("service_unavailable", "Sponsor disclosure feed temporarily unavailable", 503)


@public_transparency_bp.route("/sponsor-disclosures/<disclosure_ref>", methods=["GET"])
@limiter.limit("120 per hour")
def sponsor_disclosure_detail_route(disclosure_ref: str):
    try:
        payload = get_public_sponsor_disclosure(disclosure_ref)
        if not payload:
            return error("not_found", "Sponsor disclosure not found", 404)

        return ok(SPONSOR_DISCLOSURE_DETAIL_SCHEMA.dump(payload))
    except Exception:
        current_app.logger.exception("Public sponsor disclosure detail failed for ref %s", disclosure_ref)
        db.session.rollback()
        return error("service_unavailable", "Sponsor disclosure detail temporarily unavailable", 503)
