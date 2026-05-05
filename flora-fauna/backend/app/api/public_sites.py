from __future__ import annotations

from flask import Blueprint, current_app, request

from ..extensions import db, limiter
from ..schemas import PublicSiteResolutionResponseSchema
from ..services.public_site_service import resolve_public_site_for_host, resolve_public_site_for_site_hint
from .utils import error, ok

public_sites_bp = Blueprint("public_sites", __name__, url_prefix="/api/public/sites")

PUBLIC_SITE_RESOLUTION_SCHEMA = PublicSiteResolutionResponseSchema()


def _resolve_host_from_request() -> str:
    raw_host = request.args.get("host")
    if raw_host and str(raw_host).strip():
        return str(raw_host)
    raw_origin = request.headers.get("Origin")
    if raw_origin and str(raw_origin).strip():
        return str(raw_origin)
    return request.headers.get("X-Forwarded-Host") or request.host or ""


def _resolve_site_hint_from_request() -> str | None:
    for key in ("site", "site_slug", "slug", "site_id", "app_id"):
        value = request.args.get(key)
        if value and str(value).strip():
            return str(value)
    for key in ("X-ANU-Site", "X-ANU-Site-Slug", "X-ANU-App-ID"):
        value = request.headers.get(key)
        if value and str(value).strip():
            return str(value)
    return None


def _resolve_public_site_payload():
    host = _resolve_host_from_request()
    site_hint = _resolve_site_hint_from_request()
    if site_hint:
        payload = resolve_public_site_for_site_hint(site_hint, host=host)
        if payload is None:
            return None
        return payload
    return resolve_public_site_for_host(host)


@public_sites_bp.route("/resolve", methods=["GET"])
@limiter.limit("240 per hour")
def resolve_public_site_route():
    try:
        payload = _resolve_public_site_payload()
        if payload is None:
            return error("not_found", "White-label site hint is not configured", 404)
        return ok(PUBLIC_SITE_RESOLUTION_SCHEMA.dump(payload))
    except Exception:
        current_app.logger.exception("Public site resolution failed")
        db.session.rollback()
        return error("service_unavailable", "Public site resolution temporarily unavailable", 503)


@public_sites_bp.route("/current/manifest", methods=["GET"])
@limiter.limit("240 per hour")
def current_public_site_manifest_route():
    try:
        payload = _resolve_public_site_payload()
        if payload is None:
            return error("not_found", "White-label site hint is not configured", 404)
        return ok(PUBLIC_SITE_RESOLUTION_SCHEMA.dump(payload))
    except Exception:
        current_app.logger.exception("Current public site manifest resolution failed")
        db.session.rollback()
        return error("service_unavailable", "Public site manifest temporarily unavailable", 503)
