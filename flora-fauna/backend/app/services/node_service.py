from flask import request

from ..models import Node, NodeDomain, db
from ..config import Config
from .white_label_site_registry import find_white_label_site_by_deployment_alias, normalize_hostname


def get_default_node():
    node = Node.query.filter_by(is_default=True).first()
    if node:
        return node
    node = Node.query.filter_by(slug=Config.DEFAULT_NODE_SLUG).first()
    if node:
        return node
    node = Node(slug=Config.DEFAULT_NODE_SLUG, name="Default Node", is_default=True)
    db.session.add(node)
    db.session.commit()
    return node


def resolve_node(node_id_or_slug):
    if not node_id_or_slug:
        return get_default_node()
    if isinstance(node_id_or_slug, int):
        return Node.query.get(node_id_or_slug)
    if isinstance(node_id_or_slug, str) and node_id_or_slug.isdigit():
        return Node.query.get(int(node_id_or_slug))
    return Node.query.filter_by(slug=node_id_or_slug).first()


def _can_trust_node_context_headers(req) -> bool:
    path = getattr(req, "path", "") or ""
    if path.startswith("/api/control/") or path.startswith("/control/"):
        return True
    return req.headers.get("X-Control-Proxy") == "anu-006"


def resolve_node_from_request(req=None):
    req = req or request
    header_node = req.headers.get("X-Node-Id") or req.headers.get("X-Node-Slug")
    if header_node and _can_trust_node_context_headers(req):
        return resolve_node(header_node)
    host = normalize_hostname(req.headers.get("X-Forwarded-Host") or req.host or "")
    if host:
        try:
            domain = NodeDomain.query.filter_by(domain=host, status="active").first()
            if domain:
                return Node.query.get(domain.node_id)
            registry_site = find_white_label_site_by_deployment_alias(host)
            if registry_site:
                node = Node.query.filter_by(slug=registry_site.slug, status="active").first()
                if node:
                    return node
        except Exception:
            db.session.rollback()
            return get_default_node()
    return get_default_node()
