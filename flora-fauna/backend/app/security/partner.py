from functools import wraps

from flask import current_app, jsonify, request, g

from ..models import PartnerKey, NodeConfig

try:
    import jwt
except Exception:  # pragma: no cover
    jwt = None


def _get_node_context():
    node = getattr(g, "node", None)
    node_id = getattr(g, "node_id", None)
    if not node and node_id:
        return None, node_id
    return node, node_id


def _get_partner_config(node_id):
    cfg = NodeConfig.query.filter_by(node_id=node_id).first()
    return cfg.config_json if cfg and isinstance(cfg.config_json, dict) else {}


def _load_partner_key(node_id, key_id):
    if not key_id:
        return None
    return PartnerKey.query.filter_by(node_id=node_id, key_id=key_id, status="active").first()


def decode_partner_token(token, node_id):
    if jwt is None:
        raise ValueError("JWT library not available")
    if not token:
        raise ValueError("Missing partner token")
    config = _get_partner_config(node_id)
    header = jwt.get_unverified_header(token)
    key_id = header.get("kid") or request.headers.get("X-Partner-Key-Id")
    key = _load_partner_key(node_id, key_id)
    if not key:
        raise ValueError("Partner key not found")
    issuer = config.get("partner_jwt_issuer")
    audience = config.get("partner_jwt_audience")
    options = {
        "verify_aud": bool(audience),
        "verify_iss": bool(issuer),
    }
    return jwt.decode(
        token,
        key.public_key,
        algorithms=["RS256", "ES256"],
        audience=audience,
        issuer=issuer,
        options=options,
    )


def require_partner_auth():
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            node, node_id = _get_node_context()
            if not node_id:
                return jsonify({"ok": False, "error": {"code": "node_required", "message": "Node context required"}, "request_id": getattr(g, "request_id", None)}), 400
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return jsonify({"ok": False, "error": {"code": "unauthorized", "message": "Partner token required"}, "request_id": getattr(g, "request_id", None)}), 401
            token = auth_header.split(" ", 1)[1]
            try:
                claims = decode_partner_token(token, node_id)
            except Exception as exc:
                return jsonify({"ok": False, "error": {"code": "unauthorized", "message": str(exc)} , "request_id": getattr(g, "request_id", None)}), 401
            g.partner = {
                "node_id": node_id,
                "node_slug": node.slug if node else None,
                "claims": claims,
            }
            return fn(*args, **kwargs)
        return wrapper
    return decorator
