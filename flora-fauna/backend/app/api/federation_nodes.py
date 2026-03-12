from datetime import datetime

from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import create_access_token

from ..extensions import limiter, db
from ..models import PartnerKey, NodeConfig, AuditRecord
from ..security.policy import get_current_user, require_permission
from ..security.partner import require_partner_auth, decode_partner_token
from ..services.feature_flag_service import is_enabled
from ..services.identity_bridge_service import (
    find_or_create_identity_link,
    resolve_identity_link,
    verify_oidc_token,
)
from ..services.federation_node_service import add_benefits_entry, get_or_create_benefits_account, compute_node_constellation_aggregates
from .utils import ok, error


federation_nodes_bp = Blueprint("federation_nodes", __name__, url_prefix="/node")


@federation_nodes_bp.route("/auth/bridge", methods=["POST"])
@limiter.limit("20 per minute")
def bridge_identity():
    if not (is_enabled("FEDERATION_NODES_ENABLED") and is_enabled("NODE_IDENTITY_BRIDGE_ENABLED")):
        return error("disabled", "Identity bridge disabled", status=403)
    node_id = getattr(g, "node_id", None)
    if not node_id:
        return error("node_required", "Node context required", status=400)
    payload = request.get_json() or {}
    mode = payload.get("mode", "jwt")
    token = payload.get("token")
    if not token:
        return error("validation_error", "token required", status=400)
    try:
        if mode == "oidc":
            claims = verify_oidc_token(token, node_id)
        else:
            claims = decode_partner_token(token, node_id)
        partner_user_id = claims.get("sub") or claims.get("partner_user_id")
        if not partner_user_id:
            raise ValueError("partner_user_id missing")
        link, user = find_or_create_identity_link(node_id, partner_user_id, auth_mode=mode, actor_id=None)
        db.session.add(AuditRecord(
            actor_id=None,
            node_id=node_id,
            action="NODE_AUTH_SUCCESS",
            entity_type="identity_link",
            entity_id=link.global_subject_id,
            payload={"mode": mode},
        ))
        db.session.commit()
        access_token = create_access_token(identity=user.username, additional_claims={"role": user.role, "node_id": node_id, "global_subject_id": user.global_subject_id})
        return ok({
            "access_token": access_token,
            "global_subject_id": user.global_subject_id,
            "node_id": node_id,
        })
    except Exception as exc:
        db.session.add(AuditRecord(
            actor_id=None,
            node_id=node_id,
            action="NODE_AUTH_FAIL",
            entity_type="identity_bridge",
            entity_id=str(node_id),
            payload={"error": str(exc)},
        ))
        db.session.commit()
        return error("bridge_failed", str(exc), status=401)


@federation_nodes_bp.route("/keys", methods=["POST"])
@require_permission("federation:manage")
def add_partner_key():
    node_id = getattr(g, "node_id", None)
    if not node_id:
        return error("node_required", "Node context required", status=400)
    payload = request.get_json() or {}
    key_id = payload.get("key_id")
    public_key = payload.get("public_key")
    if not key_id or not public_key:
        return error("validation_error", "key_id and public_key required", status=400)
    key = PartnerKey.query.filter_by(node_id=node_id, key_id=key_id).first()
    if not key:
        key = PartnerKey(node_id=node_id, key_id=key_id, public_key=public_key)
        db.session.add(key)
    key.public_key = public_key
    key.status = payload.get("status", "active")
    key.rotated_at = datetime.utcnow() if payload.get("rotated") else key.rotated_at
    db.session.commit()
    return ok({"key_id": key.key_id, "status": key.status})


@federation_nodes_bp.route("/config", methods=["GET", "POST"])
@limiter.limit("60 per minute")
def node_config():
    if not is_enabled("FEDERATION_NODES_ENABLED"):
        return error("disabled", "Federation nodes disabled", status=403)
    node_id = getattr(g, "node_id", None)
    if not node_id:
        return error("node_required", "Node context required", status=400)
    if request.method == "GET":
        cfg = NodeConfig.query.filter_by(node_id=node_id).first()
        data = cfg.config_json if cfg and isinstance(cfg.config_json, dict) else {}
        # Return only safe fields
        safe = {"theme": data.get("theme", {}), "features": data.get("features", {}), "node": {"id": node_id}}
        return ok({"config": safe})

    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    if user.role not in ["node_admin", "platform_admin"]:
        return error("forbidden", "Insufficient permission", status=403)
    payload = request.get_json() or {}
    cfg = NodeConfig.query.filter_by(node_id=node_id).first()
    if not cfg:
        cfg = NodeConfig(node_id=node_id, config_json=payload)
        db.session.add(cfg)
    else:
        cfg.config_json = payload
    db.session.add(AuditRecord(
        actor_id=user.id,
        node_id=node_id,
        action="NODE_CONFIG_UPDATED",
        entity_type="node_config",
        entity_id=str(node_id),
    ))
    db.session.commit()
    return ok({"updated": True})


@federation_nodes_bp.route("/benefits/balance", methods=["GET"])
@require_partner_auth()
@limiter.limit("60 per minute")
def benefits_balance():
    if not is_enabled("FEDERATION_NODES_ENABLED"):
        return error("disabled", "Federation nodes disabled", status=403)
    node_id = g.partner["node_id"]
    partner_user_id = request.args.get("partner_user_id")
    global_subject_id = request.args.get("global_subject_id")
    if partner_user_id and not global_subject_id:
        link = resolve_identity_link(node_id, partner_user_id)
        if not link:
            return error("not_found", "Identity link not found", status=404)
        global_subject_id = link.global_subject_id
    if not global_subject_id:
        return error("validation_error", "global_subject_id or partner_user_id required", status=400)
    account = get_or_create_benefits_account(node_id, global_subject_id)
    return ok({"balance_cents": account.balance_cents, "global_subject_id": global_subject_id})


@federation_nodes_bp.route("/benefits/accrue", methods=["POST"])
@require_partner_auth()
@limiter.limit("30 per minute")
def benefits_accrue():
    if not is_enabled("FEDERATION_NODES_ENABLED"):
        return error("disabled", "Federation nodes disabled", status=403)
    if not is_enabled("BENEFITS_LEDGER_ENABLED"):
        return error("disabled", "Benefits ledger disabled", status=403)
    node_id = g.partner["node_id"]
    payload = request.get_json() or {}
    amount_cents = payload.get("amount_cents")
    partner_user_id = payload.get("partner_user_id")
    global_subject_id = payload.get("global_subject_id")
    if partner_user_id and not global_subject_id:
        link = resolve_identity_link(node_id, partner_user_id)
        if not link:
            return error("not_found", "Identity link not found", status=404)
        global_subject_id = link.global_subject_id
    if not global_subject_id or amount_cents is None:
        return error("validation_error", "global_subject_id and amount_cents required", status=400)
    entry, account = add_benefits_entry(
        node_id=node_id,
        global_subject_id=global_subject_id,
        entry_type="accrue",
        amount_cents=amount_cents,
        source_event_id=payload.get("source_event_id"),
        metadata=payload.get("metadata") or {},
        actor_id=None,
    )
    return ok({"balance_cents": account.balance_cents, "entry_id": entry.id}, status=201)


@federation_nodes_bp.route("/benefits/redeem", methods=["POST"])
@require_partner_auth()
@limiter.limit("20 per minute")
def benefits_redeem():
    if not is_enabled("FEDERATION_NODES_ENABLED"):
        return error("disabled", "Federation nodes disabled", status=403)
    if not is_enabled("BENEFITS_LEDGER_ENABLED"):
        return error("disabled", "Benefits ledger disabled", status=403)
    node_id = g.partner["node_id"]
    payload = request.get_json() or {}
    amount_cents = payload.get("amount_cents")
    partner_user_id = payload.get("partner_user_id")
    global_subject_id = payload.get("global_subject_id")
    if partner_user_id and not global_subject_id:
        link = resolve_identity_link(node_id, partner_user_id)
        if not link:
            return error("not_found", "Identity link not found", status=404)
        global_subject_id = link.global_subject_id
    if not global_subject_id or amount_cents is None:
        return error("validation_error", "global_subject_id and amount_cents required", status=400)
    try:
        entry, account = add_benefits_entry(
            node_id=node_id,
            global_subject_id=global_subject_id,
            entry_type="redeem",
            amount_cents=amount_cents,
            source_event_id=payload.get("reference_id"),
            metadata={"reason": payload.get("reason")},
            actor_id=None,
        )
    except Exception as exc:
        return error("redeem_failed", str(exc), status=400)
    return ok({"balance_cents": account.balance_cents, "entry_id": entry.id})


@federation_nodes_bp.route("/constellations/aggregate", methods=["POST"])
@require_permission("federation:manage")
def aggregate_constellation_node():
    if not is_enabled("FEDERATION_SHARING_ENABLED"):
        return error("disabled", "Federation sharing disabled", status=403)
    node_id = getattr(g, "node_id", None)
    payload = request.get_json() or {}
    constellation_id = payload.get("constellation_id")
    week_start = payload.get("week_start")
    if not node_id or not constellation_id or not week_start:
        return error("validation_error", "node_id, constellation_id, week_start required", status=400)
    try:
        record = compute_node_constellation_aggregates(constellation_id, node_id, week_start)
    except Exception as exc:
        return error("aggregate_failed", str(exc), status=400)
    if not record:
        return error("min_cohort", "Minimum cohort not met", status=409)
    return ok({"record_id": record.id, "evidence_hash": record.evidence_hash})


@federation_nodes_bp.route("/widget/bootstrap", methods=["GET"])
@require_partner_auth()
def widget_bootstrap():
    if not is_enabled("FEDERATION_WIDGETS_ENABLED"):
        return error("disabled", "Widgets disabled", status=403)
    node_id = g.partner["node_id"]
    cfg = NodeConfig.query.filter_by(node_id=node_id).first()
    data = cfg.config_json if cfg and isinstance(cfg.config_json, dict) else {}
    return ok({
        "node": {"id": node_id, "slug": g.partner.get("node_slug")},
        "theme": data.get("theme", {}),
        "features": data.get("features", {}),
        "endpoints": {
            "benefits_balance": "/api/node/benefits/balance",
        },
    })


@federation_nodes_bp.route("/widget/shell", methods=["GET"])
def widget_shell():
    if not is_enabled("FEDERATION_WIDGETS_ENABLED"):
        return "Widgets disabled", 403
    widget = request.args.get("widget", "benefits")
    token = request.args.get("token", "")
    partner_user_id = request.args.get("partner_user_id", "")
    html = f"""
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Federation Widget</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 0; padding: 12px; background: #f7f6f3; }}
    .card {{ background: white; border-radius: 12px; padding: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }}
    .muted {{ color: #666; font-size: 12px; }}
  </style>
</head>
<body>
  <div class="card" id="widget-root">Loading...</div>
  <script>
    const root = document.getElementById('widget-root');
    async function load() {{
      if ('{widget}' === 'benefits') {{
        const res = await fetch('/api/node/benefits/balance?partner_user_id={partner_user_id}', {{
          headers: {{ 'Authorization': 'Bearer {token}' }}
        }});
        const json = await res.json();
        if (!json.ok) {{ root.textContent = json.error?.message || 'Error'; return; }}
        root.innerHTML = `<h3>Benefits Balance</h3><div><strong>$${{(json.data.balance_cents/100).toFixed(2)}}</strong></div><div class="muted">Node benefits ledger</div>`;
      }} else {{
        root.textContent = 'Widget not configured';
      }}
    }}
    load();
  </script>
</body>
</html>
"""
    return html
