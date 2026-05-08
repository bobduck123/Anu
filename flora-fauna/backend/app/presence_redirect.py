"""Friendly redirects for Presence frontend routes that hit the backend host."""

from __future__ import annotations

from urllib.parse import quote

from flask import Blueprint, redirect, request

from .services.presence_service import configured_presence_public_origin


presence_redirect_bp = Blueprint("presence_redirect", __name__)


@presence_redirect_bp.route("/p/<path:presence_path>", methods=["GET"])
def redirect_presence_frontend_path(presence_path: str):
    """Redirect public Presence page paths from backend host to frontend host.

    This catches common wrong-host requests such as
    https://anu-back-end.vercel.app/p/jafar and sends people to the canonical
    product frontend instead of showing a generic backend 404.
    """
    origin = configured_presence_public_origin().rstrip("/")
    target = f"{origin}/p/{quote(presence_path.strip('/'), safe='/-._~')}"
    if request.query_string:
        target = f"{target}?{request.query_string.decode('utf-8', errors='ignore')}"
    return redirect(target, code=302)
