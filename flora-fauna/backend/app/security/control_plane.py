from __future__ import annotations

import hashlib
import hmac
import json
from datetime import datetime
from functools import wraps
from typing import Iterable, Sequence

from flask import current_app, g, jsonify, request
from flask_jwt_extended import get_jwt, verify_jwt_in_request

from ..extensions import db
from ..models import ControlAuditEvent, ControlTokenGrant
from .plane_log import emit_plane_log
from .policy import get_current_user
from ..time_utils import now_utc
from .observability import observe_control_auth_failure


DEFAULT_CONTROL_ROLES = {
    "admin",
    "institution",
    "publisher",
    "platform_admin",
    "node_admin",
    "board_member",
    "treasury_guardian",
}

ALL_CONTROL_SCOPES = {
    "connectors:read",
    "connectors:write",
    "connectors:pull",
    "worlds:publish",
    "worlds:patch",
    "worlds:keys:read",
    "worlds:keys:rotate",
    "education:manage",
    "coordination:manage",
    "audit:read",
    "audit:export",
    "sites:manifest:read",
    "sites:manifest:write",
    "sites:domains:read",
    "sites:domains:write",
    "sites:publish-readiness:read",
    "sites:operator-assignments:read",
    "sites:operator-assignments:write",
    "sites:bootstrap:write",
    "sites:tenants:read",
    "sites:tenants:write",
    "presence.node.create",
    "presence.node.read",
    "presence.node.update",
    "presence.node.delete",
    "presence.node.publish",
    "presence.node.suspend",
    "presence.node.archive",
    "presence.enquiry.read",
    "presence.enquiry.update",
    "presence.template.manage",
    "presence.analytics.read",
    "presence.organisation.manage",
    "presence.collection.manage",
    "presence.work.manage",
    "presence.service.manage",
    "presence.proof.manage",
    "presence.procurement.manage",
    "presence.nfc.manage",
    "presence.connection.read",
    "presence.connection.update",
    "presence.quote.manage",
    "presence.variation.manage",
    "presence.handover.manage",
}


def _default_scope_matrix() -> dict[str, set[str]]:
    # Conservative additive default: preserve current control-plane capabilities.
    return {role: set(ALL_CONTROL_SCOPES) for role in DEFAULT_CONTROL_ROLES}


def _configured_scope_matrix() -> dict[str, set[str]]:
    configured = current_app.config.get("CONTROL_ROLE_SCOPES") or {}
    matrix: dict[str, set[str]] = {}
    if isinstance(configured, dict):
        for role, scopes in configured.items():
            role_key = str(role or "").strip()
            if not role_key:
                continue
            if isinstance(scopes, str):
                values = [part.strip() for part in scopes.replace(",", " ").split(" ") if part.strip()]
            elif isinstance(scopes, (list, tuple, set)):
                values = [str(item).strip() for item in scopes if str(item).strip()]
            else:
                values = []
            matrix[role_key] = set(values)
    if matrix:
        return matrix
    return _default_scope_matrix()


def resolve_control_scopes_for_role(role: str) -> list[str]:
    role_key = str(role or "").strip()
    scopes = _configured_scope_matrix().get(role_key)
    if not scopes:
        return []
    return sorted(scopes)


def _normalize_scopes(raw_scopes) -> set[str]:
    if isinstance(raw_scopes, str):
        return {part.strip() for part in raw_scopes.replace(",", " ").split(" ") if part.strip()}
    if isinstance(raw_scopes, (list, tuple, set)):
        return {str(item).strip() for item in raw_scopes if str(item).strip()}
    return set()


def _scope_allowed(granted_scopes: set[str], required_scope: str) -> bool:
    if "control:*" in granted_scopes:
        return True
    if required_scope in granted_scopes:
        return True
    namespace = required_scope.split(":", 1)[0]
    if f"{namespace}:*" in granted_scopes:
        return True
    return False


def _require_scopes(granted_scopes: set[str], required_scopes: Sequence[str]) -> bool:
    for required in required_scopes:
        required_value = str(required or "").strip()
        if not required_value:
            continue
        if not _scope_allowed(granted_scopes, required_value):
            return False
    return True


def _host_from_request() -> str:
    return (request.host or "").split(":")[0].strip().lower()


def _runtime_env() -> str:
    env = str(current_app.config.get("FLASK_ENV") or "").strip().lower()
    if env:
        return env
    if bool(current_app.config.get("TESTING")):
        return "testing"
    return "development"


def _is_local_dev_runtime() -> bool:
    return _runtime_env() in {"development", "testing"}


def _allowed_control_hosts() -> set[str]:
    configured = current_app.config.get("CONTROL_PLANE_HOSTS") or []
    hosts = {_normalize_host(item) for item in configured if item}
    if hosts:
        return hosts
    # Local-only fallback. Non-dev runtimes must configure explicit hosts.
    if _is_local_dev_runtime():
        return {"localhost", "127.0.0.1"}
    return set()


def _normalize_host(host: str) -> str:
    return (host or "").split(":")[0].strip().lower()


def _allowed_control_roles() -> set[str]:
    configured: Iterable[str] = current_app.config.get("CONTROL_PLANE_ALLOWED_ROLES") or []
    roles = {str(role).strip() for role in configured if str(role).strip()}
    if roles:
        return roles
    return set(DEFAULT_CONTROL_ROLES)


def _control_error(message: str, status: int = 403):
    reason = (message or "unknown").strip().lower().replace(" ", "_")[:80]
    observe_control_auth_failure(reason=reason)
    emit_plane_log(
        plane="control",
        event_name="control_auth_failed",
        level="warning",
        context={
            "reason": reason,
            "status": status,
            "route": request.path,
            "method": request.method,
            "host": _host_from_request(),
        },
    )
    return jsonify({
        "ok": False,
        "error": {"code": "control_plane_forbidden", "message": message},
        "request_id": getattr(g, "request_id", None),
    }), status


def _shared_secret_required() -> bool:
    return not _is_local_dev_runtime()


def _check_shared_secret() -> bool:
    expected = current_app.config.get("CONTROL_PLANE_SHARED_SECRET")
    if not expected:
        return not _shared_secret_required()
    provided = request.headers.get("X-Control-Plane-Secret")
    if not provided:
        return False
    return hmac.compare_digest(str(provided), str(expected))


def _shared_secret_configured() -> bool:
    expected = current_app.config.get("CONTROL_PLANE_SHARED_SECRET")
    if expected and len(str(expected).strip()) > 0:
        return True
    return not _shared_secret_required()


def _claims_expiry(claims: dict) -> datetime | None:
    exp_value = claims.get("exp")
    try:
        return datetime.utcfromtimestamp(int(exp_value))
    except Exception:
        return None


def record_control_token_grant(
    *,
    jti: str,
    user_id: int | None,
    role: str | None,
    audience: str | None,
    scopes: Sequence[str] | None,
    expires_at: datetime | None,
    issued_by_ip: str | None = None,
) -> ControlTokenGrant:
    token_jti = str(jti or "").strip()
    if not token_jti:
        raise ValueError("Control token jti is required")

    existing = ControlTokenGrant.query.filter_by(jti=token_jti).first()
    if existing:
        return existing

    row = ControlTokenGrant(
        jti=token_jti,
        user_id=user_id,
        token_use="control",
        audience=str(audience or "control"),
        role=str(role or ""),
        scopes_json=sorted(_normalize_scopes(scopes or [])),
        expires_at=expires_at,
        issued_by_ip=issued_by_ip,
    )
    db.session.add(row)
    db.session.flush()
    return row


def revoke_control_token_grant(*, jti: str, reason: str | None = None) -> ControlTokenGrant | None:
    token_jti = str(jti or "").strip()
    if not token_jti:
        return None
    row = ControlTokenGrant.query.filter_by(jti=token_jti).first()
    if not row:
        return None
    if row.revoked_at is None:
        row.revoked_at = now_utc()
        row.revoked_reason = (reason or "revoked").strip()[:300]
        db.session.flush()
    return row


def _is_control_token_grant_active(claims: dict, user_id: int | None) -> bool:
    jti = str(claims.get("jti") or "").strip()
    if not jti:
        return False
    row = ControlTokenGrant.query.filter_by(jti=jti).first()
    if not row:
        return False
    if row.revoked_at is not None:
        return False
    if row.user_id and user_id and row.user_id != user_id:
        return False
    now = now_utc()
    expiry = row.expires_at or _claims_expiry(claims)
    if expiry and expiry < now:
        return False
    return True


def _build_control_required_scopes(scopes: Sequence[str] | None) -> list[str]:
    if not scopes:
        return []
    return [str(scope).strip() for scope in scopes if str(scope).strip()]


def control_plane_required(fn=None, *, scopes: Sequence[str] | None = None):
    required_scopes = _build_control_required_scopes(scopes)

    def decorator(view_fn):
        @wraps(view_fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt() or {}
            user = get_current_user()
            if not user:
                return _control_error("Authenticated user is required", status=401)

            # Separate gateway/host guard.
            host = _host_from_request()
            if host not in _allowed_control_hosts():
                return _control_error("Control plane host restriction failed")

            if not _shared_secret_configured():
                return _control_error("Control plane shared secret is not configured")

            if not _check_shared_secret():
                return _control_error("Control plane secret validation failed")

            expected_aud = current_app.config.get("CONTROL_PLANE_JWT_AUDIENCE", "control")
            token_aud = claims.get("aud")
            if token_aud != expected_aud:
                return _control_error("Token audience is not valid for control plane")

            if bool(current_app.config.get("CONTROL_REQUIRE_TOKEN_USE_CLAIM", True)):
                if claims.get("token_use") != "control":
                    return _control_error("Token use is not valid for control plane")

            if not bool(claims.get("requires_mfa")):
                return _control_error("Control plane endpoints require MFA claim")

            role = claims.get("role") or user.role
            if role not in _allowed_control_roles():
                return _control_error("Insufficient role for control plane access")

            if bool(current_app.config.get("CONTROL_REQUIRE_TOKEN_GRANT", True)):
                if not _is_control_token_grant_active(claims, user.id):
                    return _control_error("Control token grant is not active")

            if required_scopes:
                granted_scopes = _normalize_scopes(claims.get("scp"))
                if not _require_scopes(granted_scopes, required_scopes):
                    return _control_error("Control token scope is insufficient")
                g.control_scopes = sorted(granted_scopes)

            g.control_user_id = user.id
            g.control_role = role

            return view_fn(*args, **kwargs)

        return wrapper

    if callable(fn):
        return decorator(fn)
    return decorator


def compute_control_event_hash_payload(
    *,
    chain_index: int,
    prev_hash: str,
    actor_id: int | None,
    action: str,
    target_type: str | None,
    target_id: str | None,
    method: str | None,
    route: str | None,
    ip_address: str | None,
    created_at: datetime,
    payload: dict | None,
) -> str:
    payload_obj = payload or {}
    payload_canonical = json.dumps(payload_obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    hash_input = "|".join(
        [
            str(chain_index),
            prev_hash,
            str(actor_id or ""),
            str(action or ""),
            str(target_type or ""),
            str(target_id or ""),
            str(method or ""),
            str(route or ""),
            str(ip_address or ""),
            created_at.isoformat(),
            payload_canonical,
        ]
    )
    return hashlib.sha256(hash_input.encode("utf-8")).hexdigest()


def log_control_event(
    action: str,
    actor_id: int | None,
    target_type: str | None = None,
    target_id: str | None = None,
    payload: dict | None = None,
) -> ControlAuditEvent:
    last_event = ControlAuditEvent.query.order_by(ControlAuditEvent.id.desc()).first()
    chain_index = int(last_event.chain_index or 0) + 1 if last_event else 1
    prev_hash = (last_event.event_hash if last_event else None) or "GENESIS"
    created_at = now_utc()
    payload_obj = payload or {}
    event_hash = compute_control_event_hash_payload(
        chain_index=chain_index,
        prev_hash=prev_hash,
        actor_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        method=request.method,
        route=request.path,
        ip_address=request.remote_addr,
        created_at=created_at,
        payload=payload_obj,
    )

    event = ControlAuditEvent(
        actor_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        method=request.method,
        route=request.path,
        ip_address=request.remote_addr,
        payload=payload_obj,
        chain_index=chain_index,
        prev_hash=prev_hash,
        event_hash=event_hash,
        created_at=created_at,
    )
    db.session.add(event)
    db.session.commit()
    emit_plane_log(
        plane="control",
        event_name="control_audit_event_recorded",
        level="info",
        context={
            "action": action,
            "actor_id": actor_id,
            "target_type": target_type,
            "target_id": target_id,
            "method": request.method,
            "route": request.path,
            "chain_index": chain_index,
            "event_id": event.id,
            "payload_keys": sorted(payload_obj.keys()),
        },
    )
    return event
