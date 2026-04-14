from __future__ import annotations

from flask import Blueprint, current_app, request

from ..extensions import db, limiter
from ..schemas import PublicSiteResolutionResponseSchema
from ..services.public_site_service import resolve_public_site_for_host
from .utils import error, ok

public_sites_bp = Blueprint("public_sites", __name__, url_prefix="/api/public/sites")

PUBLIC_SITE_RESOLUTION_SCHEMA = PublicSiteResolutionResponseSchema()


def _resolve_host_from_request() -> str:
    raw_host = request.args.get("host")
    if raw_host and str(raw_host).strip():
        return str(raw_host)
    return request.headers.get("X-Forwarded-Host") or request.host or ""


@public_sites_bp.route("/resolve", methods=["GET"])
@limiter.limit("240 per hour")
def resolve_public_site_route():
    try:
        payload = resolve_public_site_for_host(_resolve_host_from_request())
        return ok(PUBLIC_SITE_RESOLUTION_SCHEMA.dump(payload))
    except Exception:
        current_app.logger.exception("Public site resolution failed")
        db.session.rollback()
        return error("service_unavailable", "Public site resolution temporarily unavailable", 503)


@public_sites_bp.route("/current/manifest", methods=["GET"])
@limiter.limit("240 per hour")
def current_public_site_manifest_route():
    try:
        payload = resolve_public_site_for_host(_resolve_host_from_request())
        return ok(PUBLIC_SITE_RESOLUTION_SCHEMA.dump(payload))
    except Exception:
        current_app.logger.exception("Current public site manifest resolution failed")
        db.session.rollback()
        return error("service_unavailable", "Public site manifest temporarily unavailable", 503)

