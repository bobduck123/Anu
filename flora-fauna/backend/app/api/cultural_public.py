from __future__ import annotations

import hashlib

from flask import Blueprint, request

from ..extensions import db, limiter
from ..models import (
    CIQuestTemplate,
    Commitment,
    FusedEvent,
    GraphEntity,
    StoryCluster,
    WorldPatch,
    WorldSnapshot,
)
from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user
from ..services.cultural_intel import (
    find_triggered_quest_templates,
    get_entity_evidence,
    get_entity_neighborhood,
    get_entity_timeline,
    get_patches,
    get_snapshot,
    list_clusters_cursor,
    list_clusters,
    list_fused_events_cursor,
    list_fused_events,
    list_guided_journeys,
    list_learning_modules,
    list_quests_for_user,
    search_entities,
    search_entities_cursor,
    start_quest,
    track_quest_progress,
)
from ..services.cultural_intel.coordination import add_checkin, list_commitments_for_user
from .utils import error, ok


cultural_public_bp = Blueprint("cultural_public", __name__, url_prefix="/public")


def _safe_int(value, default: int, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(maximum, parsed))


def _safe_float(value, default: float, minimum: float | None = None, maximum: float | None = None) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return default
    if minimum is not None:
        parsed = max(minimum, parsed)
    if maximum is not None:
        parsed = min(maximum, parsed)
    return parsed


def _safe_cursor(value) -> int | None:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    if parsed <= 0:
        return None
    return parsed


def _etag(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _etag_not_modified(etag_value: str) -> bool:
    incoming = (request.headers.get("If-None-Match") or "").strip().strip('"')
    return bool(incoming) and incoming == etag_value


def _ok_with_etag(data, etag_value: str, status: int = 200):
    response, _ = ok(data, status=status)
    response.headers["ETag"] = f'"{etag_value}"'
    return response, status


@cultural_public_bp.route("/intel/events", methods=["GET"])
@limiter.limit("240 per minute")
def get_public_fused_events():
    limit = _safe_int(request.args.get("limit"), default=50, minimum=1, maximum=200)
    event_type = request.args.get("event_type")
    region = request.args.get("region")
    query = FusedEvent.query
    if event_type:
        query = query.filter_by(event_type=event_type)
    if region:
        query = query.filter_by(region=region)
    total, latest_updated = query.with_entities(
        db.func.count(FusedEvent.id),
        db.func.max(FusedEvent.updated_at),
    ).first()
    etag_value = _etag(
        f"intel-events:{event_type or ''}:{region or ''}:{limit}:{int(total or 0)}:{latest_updated.isoformat() if latest_updated else ''}"
    )
    if _etag_not_modified(etag_value):
        response = ok(None, status=304)[0]
        response.set_data(b"")
        response.headers["ETag"] = f'"{etag_value}"'
        return response, 304
    payload = list_fused_events(
        event_type=event_type,
        region=region,
        limit=limit,
    )
    return _ok_with_etag(payload, etag_value)


@cultural_public_bp.route("/intel/events/cursor", methods=["GET"])
@limiter.limit("240 per minute")
def get_public_fused_events_cursor():
    limit = _safe_int(request.args.get("limit"), default=50, minimum=1, maximum=100)
    event_type = request.args.get("event_type")
    region = request.args.get("region")
    cursor = _safe_cursor(request.args.get("cursor"))
    payload = list_fused_events_cursor(
        event_type=event_type,
        region=region,
        limit=limit,
        cursor=cursor,
    )
    return ok(payload)


@cultural_public_bp.route("/intel/clusters", methods=["GET"])
@limiter.limit("240 per minute")
def get_public_story_clusters():
    limit = _safe_int(request.args.get("limit"), default=50, minimum=1, maximum=200)
    min_score = request.args.get("min_score")
    min_score_value = _safe_float(min_score, default=0.0, minimum=0.0, maximum=1.0) if min_score is not None else None
    query = StoryCluster.query
    if min_score_value is not None:
        query = query.filter(StoryCluster.score >= min_score_value)
    total, latest_updated = query.with_entities(
        db.func.count(StoryCluster.id),
        db.func.max(StoryCluster.updated_at),
    ).first()
    etag_value = _etag(
        f"intel-clusters:{min_score_value if min_score_value is not None else ''}:{limit}:{int(total or 0)}:{latest_updated.isoformat() if latest_updated else ''}"
    )
    if _etag_not_modified(etag_value):
        response = ok(None, status=304)[0]
        response.set_data(b"")
        response.headers["ETag"] = f'"{etag_value}"'
        return response, 304
    payload = list_clusters(
        limit=limit,
        min_score=min_score_value,
    )
    return _ok_with_etag(payload, etag_value)


@cultural_public_bp.route("/intel/clusters/cursor", methods=["GET"])
@limiter.limit("240 per minute")
def get_public_story_clusters_cursor():
    limit = _safe_int(request.args.get("limit"), default=50, minimum=1, maximum=100)
    min_score = request.args.get("min_score")
    min_score_value = _safe_float(min_score, default=0.0, minimum=0.0, maximum=1.0) if min_score is not None else None
    cursor = _safe_cursor(request.args.get("cursor"))
    payload = list_clusters_cursor(
        limit=limit,
        min_score=min_score_value,
        cursor=cursor,
    )
    return ok(payload)


@cultural_public_bp.route("/graph/search", methods=["GET"])
@limiter.limit("180 per minute")
def search_graph_entities():
    query = (request.args.get("q") or "").strip()
    if not query:
        return ok([])
    limit = _safe_int(request.args.get("limit"), default=20, minimum=1, maximum=40)
    return ok(search_entities(query, limit=limit))


@cultural_public_bp.route("/graph/search/cursor", methods=["GET"])
@limiter.limit("180 per minute")
def search_graph_entities_cursor():
    query = (request.args.get("q") or "").strip()
    if not query:
        return ok({"items": [], "next_cursor": None, "has_more": False})
    limit = _safe_int(request.args.get("limit"), default=20, minimum=1, maximum=40)
    cursor = _safe_cursor(request.args.get("cursor"))
    return ok(search_entities_cursor(query_text=query, limit=limit, cursor=cursor))


@cultural_public_bp.route("/graph/nodes/<int:entity_id>", methods=["GET"])
@limiter.limit("180 per minute")
def get_graph_node(entity_id: int):
    entity = db.session.get(GraphEntity, entity_id)
    if not entity:
        return error("not_found", "Entity not found", 404)
    return ok(entity.to_dict())


@cultural_public_bp.route("/graph/nodes/<int:entity_id>/neighborhood", methods=["GET"])
@limiter.limit("180 per minute")
def get_graph_neighborhood(entity_id: int):
    return ok(get_entity_neighborhood(entity_id))


@cultural_public_bp.route("/graph/nodes/<int:entity_id>/timeline", methods=["GET"])
@limiter.limit("180 per minute")
def get_graph_timeline(entity_id: int):
    limit = _safe_int(request.args.get("limit"), default=50, minimum=1, maximum=200)
    return ok(get_entity_timeline(entity_id=entity_id, limit=limit))


@cultural_public_bp.route("/graph/nodes/<int:entity_id>/evidence", methods=["GET"])
@limiter.limit("180 per minute")
def get_graph_evidence(entity_id: int):
    limit = _safe_int(request.args.get("limit"), default=100, minimum=1, maximum=300)
    return ok(get_entity_evidence(entity_id=entity_id, limit=limit))


@cultural_public_bp.route("/learn/modules", methods=["GET"])
@limiter.limit("200 per minute")
def get_learning_modules():
    return ok(list_learning_modules())


@cultural_public_bp.route("/learn/journeys", methods=["GET"])
@limiter.limit("200 per minute")
def get_guided_journeys():
    return ok(list_guided_journeys())


@cultural_public_bp.route("/quests/templates", methods=["GET"])
@limiter.limit("200 per minute")
def get_quest_templates():
    rows = CIQuestTemplate.query.filter_by(status="active").order_by(CIQuestTemplate.updated_at.desc()).all()
    return ok([row.to_dict() for row in rows])


@cultural_public_bp.route("/quests/start", methods=["POST"])
@alpha_jwt_required()
@limiter.limit("60 per minute")
def start_public_quest():
    user = get_current_user()
    if not user:
        return error("unauthorized", "User not found", 401)
    payload = request.get_json(silent=True) or {}
    raw_template_id = payload.get("quest_template_id")
    raw_cluster_id = payload.get("cluster_id")
    quest_template_id = _safe_int(raw_template_id, default=0, minimum=0, maximum=2_147_483_647)
    cluster_id = _safe_int(raw_cluster_id, default=0, minimum=0, maximum=2_147_483_647)
    if raw_template_id is not None and quest_template_id == 0:
        return error("validation_error", "quest_template_id must be a positive integer", 400)
    if raw_cluster_id is not None and cluster_id == 0:
        return error("validation_error", "cluster_id must be a positive integer", 400)

    template = None
    if quest_template_id:
        template = db.session.get(CIQuestTemplate, quest_template_id)
    elif cluster_id:
        cluster = db.session.get(StoryCluster, cluster_id)
        if not cluster:
            return error("not_found", "Cluster not found", 404)
        triggered = find_triggered_quest_templates(cluster=cluster)
        if triggered:
            template = triggered[0]

    if not template:
        return error("validation_error", "No eligible quest template found", 400)

    instance = start_quest(
        user_id=user.id,
        quest_template=template,
        cluster_id=cluster_id if cluster_id else None,
    )
    db.session.commit()
    return ok(instance.to_dict(), status=201)


@cultural_public_bp.route("/quests", methods=["GET"])
@alpha_jwt_required()
@limiter.limit("180 per minute")
def get_public_quests():
    user = get_current_user()
    if not user:
        return error("unauthorized", "User not found", 401)
    return ok(list_quests_for_user(user.id))


@cultural_public_bp.route("/quests/<int:quest_instance_id>/progress", methods=["POST"])
@alpha_jwt_required()
@limiter.limit("90 per minute")
def update_public_quest_progress(quest_instance_id: int):
    user = get_current_user()
    if not user:
        return error("unauthorized", "User not found", 401)
    payload = request.get_json(silent=True) or {}
    parsed_progress = _safe_float(payload.get("progress_percent"), default=0.0, minimum=0.0, maximum=100.0)
    try:
        instance = track_quest_progress(
            quest_instance_id=quest_instance_id,
            progress_percent=parsed_progress,
            step_key=(payload.get("step_key") or "progress_update"),
            notes=payload.get("notes"),
            evidence=payload.get("evidence"),
            actor_id=user.id,
        )
        db.session.commit()
    except ValueError as exc:
        db.session.rollback()
        return error("validation_error", str(exc), 400)
    return ok(instance.to_dict())


@cultural_public_bp.route("/worlds/<string:world_id>/snapshot", methods=["GET"])
@limiter.limit("200 per minute")
def get_public_world_snapshot(world_id: str):
    version = request.args.get("version")
    parsed_version = _safe_int(version, default=0, minimum=0, maximum=10_000) if version else None
    snapshot_row = None
    if parsed_version:
        snapshot_row = (
            WorldSnapshot.query.filter_by(world_id=world_id, version=parsed_version)
            .with_entities(WorldSnapshot.world_id, WorldSnapshot.version, WorldSnapshot.signature)
            .first()
        )
    else:
        snapshot_row = (
            WorldSnapshot.query.filter_by(world_id=world_id)
            .order_by(WorldSnapshot.version.desc())
            .with_entities(WorldSnapshot.world_id, WorldSnapshot.version, WorldSnapshot.signature)
            .first()
        )
    if snapshot_row:
        etag_value = _etag(f"world-snapshot:{snapshot_row.world_id}:{snapshot_row.version}:{snapshot_row.signature}")
        if _etag_not_modified(etag_value):
            response = ok(None, status=304)[0]
            response.set_data(b"")
            response.headers["ETag"] = f'"{etag_value}"'
            return response, 304

    snapshot = get_snapshot(world_id=world_id, version=parsed_version if parsed_version else None)
    if not snapshot:
        return error("not_found", "World snapshot not found", 404)
    etag_value = _etag(f"world-snapshot:{snapshot['world_id']}:{snapshot['version']}:{snapshot['signature']}")
    return _ok_with_etag(snapshot, etag_value)


@cultural_public_bp.route("/worlds/<string:world_id>/patches", methods=["GET"])
@limiter.limit("200 per minute")
def get_public_world_patches(world_id: str):
    since_version = request.args.get("since_version")
    parsed_since = _safe_int(since_version, default=0, minimum=0, maximum=10_000) if since_version else None
    query = WorldPatch.query.filter_by(world_id=world_id)
    if parsed_since:
        query = query.filter(WorldPatch.to_version > parsed_since)
    total, latest_version = query.with_entities(
        db.func.count(WorldPatch.id),
        db.func.max(WorldPatch.to_version),
    ).first()
    etag_value = _etag(f"world-patches:{world_id}:{parsed_since or 0}:{int(total or 0)}:{int(latest_version or 0)}")
    if _etag_not_modified(etag_value):
        response = ok(None, status=304)[0]
        response.set_data(b"")
        response.headers["ETag"] = f'"{etag_value}"'
        return response, 304
    payload = get_patches(world_id=world_id, since_version=parsed_since if parsed_since else None)
    return _ok_with_etag(payload, etag_value)


@cultural_public_bp.route("/coordination/commitments", methods=["GET"])
@alpha_jwt_required()
@limiter.limit("180 per minute")
def get_public_commitments():
    user = get_current_user()
    if not user:
        return error("unauthorized", "User not found", 401)
    rows = list_commitments_for_user(user.id)
    return ok([row.to_dict() for row in rows])


@cultural_public_bp.route("/coordination/commitments/<int:commitment_id>/check-in", methods=["POST"])
@alpha_jwt_required()
@limiter.limit("120 per minute")
def submit_public_commitment_checkin(commitment_id: int):
    user = get_current_user()
    if not user:
        return error("unauthorized", "User not found", 401)
    commitment = db.session.get(Commitment, commitment_id)
    if not commitment:
        return error("not_found", "Commitment not found", 404)
    if commitment.user_id != user.id and user.role not in {"platform_admin", "node_admin", "board_member"}:
        return error("forbidden", "Cannot submit check-in for this commitment", 403)
    payload = request.get_json(silent=True) or {}
    evidence = add_checkin(
        commitment_id=commitment_id,
        payload=payload.get("payload") or payload,
        submitted_by=user.id,
        evidence_type=payload.get("evidence_type") or "checkin",
    )
    db.session.commit()
    return ok(evidence.to_dict(), status=201)
