from flask import Blueprint, request, g

from ..extensions import db
from ..models import Insight
from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user, require_permission
from ..services.feature_flag_service import is_enabled
from .utils import ok, error


insights_bp = Blueprint("insights", __name__, url_prefix="/insights")


@insights_bp.route("", methods=["GET"])
def list_insights():
    if not is_enabled("INSIGHTS_ENABLED"):
        return error("disabled", "Insights disabled", status=403)
    domain = request.args.get("domain_tag")
    microcosm_id = request.args.get("microcosm_id")
    q = Insight.query
    if g.get("node_id"):
        q = q.filter_by(node_id=g.node_id)
    if domain:
        q = q.filter_by(domain_tag=domain)
    if microcosm_id:
        q = q.filter_by(microcosm_id=int(microcosm_id))
    items = q.order_by(Insight.created_at.desc()).limit(50).all()
    return ok({"insights": [{
        "id": i.id,
        "author_id": i.author_id,
        "microcosm_id": i.microcosm_id,
        "domain_tag": i.domain_tag,
        "title": i.title,
        "body": i.body,
        "verification_level": i.verification_level,
        "evidence_ref": i.evidence_ref,
        "created_at": i.created_at.isoformat() if i.created_at else None,
    } for i in items]})


@insights_bp.route("", methods=["POST"])
@alpha_jwt_required()
def create_insight():
    if not is_enabled("INSIGHTS_ENABLED"):
        return error("disabled", "Insights disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    title = (payload.get("title") or "").strip()
    body = (payload.get("body") or "").strip()
    domain_tag = (payload.get("domain_tag") or "").strip()
    if not title or not body or not domain_tag:
        return error("validation_error", "title, body, domain_tag required", status=400)
    insight = Insight(
        node_id=user.node_id,
        author_id=user.id,
        microcosm_id=payload.get("microcosm_id"),
        domain_tag=domain_tag[:120],
        title=title[:200],
        body=body,
        evidence_ref=payload.get("evidence_ref"),
        verification_level="unverified",
    )
    db.session.add(insight)
    db.session.commit()
    return ok({"id": insight.id}, status=201)


@insights_bp.route("/<int:insight_id>/verify", methods=["POST"])
@require_permission("insights:verify")
def verify_insight(insight_id):
    if not is_enabled("INSIGHTS_ENABLED"):
        return error("disabled", "Insights disabled", status=403)
    insight = Insight.query.get(insight_id)
    if not insight or (g.get("node_id") and insight.node_id != g.node_id):
        return error("not_found", "Insight not found", status=404)
    payload = request.get_json() or {}
    level = payload.get("verification_level", "community-verified")
    if level not in {"community-verified", "guild-reviewed"}:
        return error("validation_error", "verification_level invalid", status=400)
    insight.verification_level = level
    db.session.commit()
    return ok({"id": insight.id, "verification_level": insight.verification_level})
