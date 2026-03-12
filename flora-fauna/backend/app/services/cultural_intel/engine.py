from __future__ import annotations

import hashlib
import math
from datetime import datetime
from typing import Any

from flask import current_app
from sqlalchemy.exc import IntegrityError

from ...extensions import db
from ...time_utils import now_utc
from ...models import (
    CIQuestTemplate,
    ClusterEventLink,
    ConnectorRegistration,
    FusedEvent,
    FusedEventEvidence,
    GraphEntity,
    RawSignal,
    StoryCluster,
    UniversalEventObject,
    User,
)
from .connectors import get_connector_impl
from .education import find_triggered_quest_templates, start_quest
from .graph import link_event_entities


def _parse_dt(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            pass
    return now_utc()


def _normalize_title(title: str) -> str:
    compact = " ".join((title or "").strip().lower().split())
    return compact[:220] if compact else "untitled"


def _fingerprint(normalized: dict[str, Any], source_slug: str) -> str:
    key = "|".join(
        [
            str(source_slug),
            str(normalized.get("external_id") or ""),
            _normalize_title(normalized.get("title") or ""),
            str(normalized.get("event_type") or ""),
            str(normalized.get("occurred_at") or ""),
        ]
    )
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def _dedupe_key(normalized: dict[str, Any]) -> str:
    occurred = _parse_dt(normalized.get("occurred_at"))
    day = occurred.strftime("%Y-%m-%d")
    entities = normalized.get("entity_refs") or []
    anchor = ""
    if entities:
        anchor = _normalize_title((entities[0] or {}).get("name", ""))
    key = f"{normalized.get('event_type')}|{_normalize_title(normalized.get('title') or '')}|{day}|{anchor}"
    return hashlib.sha1(key.encode("utf-8")).hexdigest()


def _score_event(normalized: dict[str, Any], source_count: int) -> tuple[float, float, float, float]:
    importance = float(normalized.get("importance_hint") or 0.5)
    # Novelty proxy: shorter source fan-out is usually newer.
    novelty = max(0.0, min(1.0, 1.0 - (math.log(max(source_count, 1), 10) / 2.0)))
    # Proximity proxy: geo-tagged events score slightly higher.
    proximity = 0.7 if normalized.get("latitude") is not None and normalized.get("longitude") is not None else 0.45
    total = max(0.0, min(1.0, (importance * 0.45) + (novelty * 0.35) + (proximity * 0.20)))
    return novelty, proximity, importance, total


def _cluster_key(normalized: dict[str, Any]) -> str:
    occurred = _parse_dt(normalized.get("occurred_at"))
    window = occurred.strftime("%Y%m%d")
    refs = normalized.get("entity_refs") or []
    anchor = _normalize_title((refs[0] or {}).get("name", "global")) if refs else "global"
    region = (normalized.get("region") or "global").lower()
    key = f"{anchor}|{region}|{window}"
    return hashlib.md5(key.encode("utf-8")).hexdigest()


def register_connector(
    name: str,
    connector_type: str,
    source_slug: str,
    config: dict[str, Any] | None,
    created_by: int | None = None,
) -> ConnectorRegistration:
    existing = ConnectorRegistration.query.filter_by(name=name).first()
    if existing:
        existing.connector_type = connector_type
        existing.source_slug = source_slug
        existing.config_json = config or {}
        existing.status = "active"
        existing.created_by = created_by or existing.created_by
        db.session.flush()
        return existing

    row = ConnectorRegistration(
        name=name,
        connector_type=connector_type,
        source_slug=source_slug,
        config_json=config or {},
        status="active",
        created_by=created_by,
    )
    db.session.add(row)
    db.session.flush()
    return row


def ingest_normalized_signal(
    connector: ConnectorRegistration,
    normalized: dict[str, Any],
    raw_payload: dict[str, Any],
) -> dict[str, Any]:
    raw_row = RawSignal(
        connector_id=connector.id,
        source_slug=connector.source_slug,
        external_id=(normalized.get("external_id") or None),
        payload_json=raw_payload,
    )
    db.session.add(raw_row)
    db.session.flush()

    fingerprint = _fingerprint(normalized, connector.source_slug)
    ueo = UniversalEventObject.query.filter_by(fingerprint=fingerprint).first()
    if not ueo:
        try:
            with db.session.begin_nested():
                ueo = UniversalEventObject(
                    raw_signal_id=raw_row.id,
                    source_slug=connector.source_slug,
                    external_id=normalized.get("external_id"),
                    event_type=normalized.get("event_type") or "unknown",
                    title=normalized.get("title") or "Untitled signal",
                    summary=normalized.get("summary"),
                    occurred_at=_parse_dt(normalized.get("occurred_at")),
                    region=normalized.get("region"),
                    latitude=normalized.get("latitude"),
                    longitude=normalized.get("longitude"),
                    entity_refs_json=normalized.get("entity_refs") or [],
                    importance_hint=float(normalized.get("importance_hint") or 0.5),
                    confidence=0.55,
                    normalized_json=normalized,
                    fingerprint=fingerprint,
                )
                db.session.add(ueo)
                db.session.flush()
        except IntegrityError:
            ueo = UniversalEventObject.query.filter_by(fingerprint=fingerprint).first()
        if not ueo:
            raise ValueError("Failed to create or resolve UEO record")

    dedupe_key = _dedupe_key(normalized)
    fused = FusedEvent.query.filter_by(dedupe_key=dedupe_key).first()
    if fused:
        fused.source_count = int(fused.source_count or 0) + 1
        fused.confidence = min(0.99, 0.45 + (0.12 * fused.source_count))
        fused.last_seen_at = now_utc()
    else:
        novelty, proximity, importance, total = _score_event(normalized, 1)
        try:
            with db.session.begin_nested():
                fused = FusedEvent(
                    dedupe_key=dedupe_key,
                    event_type=normalized.get("event_type") or "unknown",
                    canonical_title=normalized.get("title") or "Untitled signal",
                    summary=normalized.get("summary"),
                    occurred_at=_parse_dt(normalized.get("occurred_at")),
                    region=normalized.get("region"),
                    latitude=normalized.get("latitude"),
                    longitude=normalized.get("longitude"),
                    source_count=1,
                    confidence=0.55,
                    novelty_score=novelty,
                    proximity_score=proximity,
                    importance_score=importance,
                    total_score=total,
                    fused_payload={
                        "sources": [connector.source_slug],
                        "entity_refs": normalized.get("entity_refs") or [],
                    },
                )
                db.session.add(fused)
                db.session.flush()
        except IntegrityError:
            fused = FusedEvent.query.filter_by(dedupe_key=dedupe_key).first()
            if fused:
                fused.source_count = int(fused.source_count or 0) + 1
                fused.confidence = min(0.99, 0.45 + (0.12 * fused.source_count))
                fused.last_seen_at = now_utc()
        if not fused:
            raise ValueError("Failed to create or resolve fused event")

    novelty, proximity, importance, total = _score_event(normalized, fused.source_count)
    fused.novelty_score = novelty
    fused.proximity_score = proximity
    fused.importance_score = importance
    fused.total_score = total
    fused.cluster_key = _cluster_key(normalized)

    link = FusedEventEvidence.query.filter_by(fused_event_id=fused.id, ueo_id=ueo.id).first()
    if not link:
        try:
            with db.session.begin_nested():
                db.session.add(
                    FusedEventEvidence(
                        fused_event_id=fused.id,
                        ueo_id=ueo.id,
                        corroborates=True,
                    )
                )
                db.session.flush()
        except IntegrityError:
            pass

    cluster = StoryCluster.query.filter_by(cluster_key=fused.cluster_key).first()
    if not cluster:
        entity_refs = normalized.get("entity_refs") or []
        label = normalized.get("title") or "Cluster"
        try:
            with db.session.begin_nested():
                cluster = StoryCluster(
                    cluster_key=fused.cluster_key,
                    label=label[:240],
                    entity_anchor=(entity_refs[0] or {}).get("name") if entity_refs else None,
                    window_start=fused.occurred_at,
                    window_end=fused.occurred_at,
                    centroid_lat=fused.latitude,
                    centroid_lng=fused.longitude,
                    event_count=0,
                    score=0.0,
                    metadata_json={"event_type": fused.event_type},
                )
                db.session.add(cluster)
                db.session.flush()
        except IntegrityError:
            cluster = StoryCluster.query.filter_by(cluster_key=fused.cluster_key).first()
        if not cluster:
            raise ValueError("Failed to create or resolve story cluster")

    cluster.event_count = int(cluster.event_count or 0) + 1
    cluster.score = min(1.0, (cluster.score or 0.0) + (fused.total_score * 0.2))
    if not cluster.window_start or fused.occurred_at < cluster.window_start:
        cluster.window_start = fused.occurred_at
    if not cluster.window_end or fused.occurred_at > cluster.window_end:
        cluster.window_end = fused.occurred_at

    ce_link = ClusterEventLink.query.filter_by(cluster_id=cluster.id, fused_event_id=fused.id).first()
    if not ce_link:
        try:
            with db.session.begin_nested():
                db.session.add(ClusterEventLink(cluster_id=cluster.id, fused_event_id=fused.id))
                db.session.flush()
        except IntegrityError:
            pass

    entities = link_event_entities(fused, ueo, normalized.get("entity_refs") or [])
    entity_types = [entity.entity_type for entity in entities]
    _spawn_cluster_quests(cluster, fused.event_type, entity_types)

    db.session.flush()
    return {
        "raw_signal_id": raw_row.id,
        "ueo_id": ueo.id,
        "fused_event_id": fused.id,
        "cluster_id": cluster.id,
    }


def _spawn_cluster_quests(cluster: StoryCluster, event_type: str, entity_types: list[str]) -> None:
    templates = find_triggered_quest_templates(
        cluster=cluster,
        event_type=event_type,
        entity_types=entity_types,
    )
    if not templates:
        return

    seed_username = current_app.config.get("ALPHA_DEFAULT_USERNAME", "alpha_public")
    user = User.query.filter_by(username=seed_username).first()
    if not user:
        user = User.query.filter_by(role="participant").order_by(User.id.asc()).first()
    if not user:
        return

    for template in templates[:3]:
        start_quest(
            user_id=user.id,
            quest_template=template,
            cluster_id=cluster.id,
        )


def pull_connector(connector_id: int) -> dict[str, Any]:
    connector = db.session.get(ConnectorRegistration, connector_id)
    if not connector:
        raise ValueError("Connector not found")
    impl = get_connector_impl(connector.connector_type)
    if not impl:
        raise ValueError(f"Unsupported connector type: {connector.connector_type}")

    pulled = impl.pull(connector.config_json or {})
    ingested = 0
    touched_events: list[int] = []
    for raw_signal in pulled:
        normalized = impl.normalize(raw_signal)
        result = ingest_normalized_signal(connector, normalized, raw_signal)
        ingested += 1
        touched_events.append(result["fused_event_id"])

    connector.last_pulled_at = now_utc()
    db.session.flush()
    return {
        "connector_id": connector.id,
        "connector_name": connector.name,
        "pulled_count": len(pulled),
        "ingested_count": ingested,
        "fused_event_ids": touched_events,
    }


def list_connectors() -> list[dict[str, Any]]:
    rows = ConnectorRegistration.query.order_by(ConnectorRegistration.id.desc()).all()
    return [
        {
            "id": row.id,
            "name": row.name,
            "connector_type": row.connector_type,
            "source_slug": row.source_slug,
            "status": row.status,
            "config": row.config_json or {},
            "last_pulled_at": row.last_pulled_at.isoformat() if row.last_pulled_at else None,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]


def list_fused_events(
    event_type: str | None = None,
    region: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    query = FusedEvent.query
    if event_type:
        query = query.filter_by(event_type=event_type)
    if region:
        query = query.filter_by(region=region)
    rows = query.order_by(FusedEvent.total_score.desc(), FusedEvent.occurred_at.desc()).limit(limit).all()
    return [row.to_dict() for row in rows]


def list_clusters(limit: int = 100, min_score: float | None = None) -> list[dict[str, Any]]:
    query = StoryCluster.query
    if min_score is not None:
        query = query.filter(StoryCluster.score >= float(min_score))
    rows = query.order_by(StoryCluster.score.desc(), StoryCluster.updated_at.desc()).limit(limit).all()
    return [row.to_dict() for row in rows]


def ensure_default_quest_templates(created_by: int | None = None) -> None:
    defaults = [
        {
            "slug": "cluster-water-watch",
            "title": "Water Watch Sprint",
            "description": "Respond to water stress signals with local verification and action steps.",
            "trigger_event_type": "environment.alert",
            "trigger_entity_type": "place",
            "min_cluster_score": 0.2,
            "reward_points": 30,
            "commitment_type": "water_stewardship",
        },
        {
            "slug": "cluster-food-resilience",
            "title": "Food Resilience Loop",
            "description": "Validate demand spikes and coordinate neighborhood provisioning.",
            "trigger_event_type": "community.demand",
            "trigger_entity_type": "facility",
            "min_cluster_score": 0.2,
            "reward_points": 25,
            "commitment_type": "food_resilience",
        },
    ]
    for item in defaults:
        existing = CIQuestTemplate.query.filter_by(slug=item["slug"]).first()
        if existing:
            continue
        db.session.add(CIQuestTemplate(created_by=created_by, status="active", **item))
    db.session.flush()


def search_entities(query: str, limit: int = 20) -> list[dict[str, Any]]:
    if not query:
        return []
    rows = (
        GraphEntity.query.filter(GraphEntity.canonical_name.ilike(f"%{query}%"))
        .order_by(GraphEntity.id.desc())
        .limit(limit)
        .all()
    )
    return [row.to_dict() for row in rows]


def list_fused_events_cursor(
    *,
    event_type: str | None = None,
    region: str | None = None,
    limit: int = 50,
    cursor: int | None = None,
) -> dict[str, Any]:
    query = FusedEvent.query
    if event_type:
        query = query.filter_by(event_type=event_type)
    if region:
        query = query.filter_by(region=region)
    if cursor is not None:
        query = query.filter(FusedEvent.id < int(cursor))
    rows = (
        query.order_by(FusedEvent.total_score.desc(), FusedEvent.occurred_at.desc(), FusedEvent.id.desc())
        .limit(limit + 1)
        .all()
    )
    has_more = len(rows) > limit
    items = rows[:limit]
    next_cursor = items[-1].id if has_more and items else None
    return {
        "items": [row.to_dict() for row in items],
        "next_cursor": str(next_cursor) if next_cursor is not None else None,
        "has_more": bool(has_more),
    }


def list_clusters_cursor(
    *,
    min_score: float | None = None,
    limit: int = 50,
    cursor: int | None = None,
) -> dict[str, Any]:
    query = StoryCluster.query
    if min_score is not None:
        query = query.filter(StoryCluster.score >= float(min_score))
    if cursor is not None:
        query = query.filter(StoryCluster.id < int(cursor))
    rows = (
        query.order_by(StoryCluster.score.desc(), StoryCluster.updated_at.desc(), StoryCluster.id.desc())
        .limit(limit + 1)
        .all()
    )
    has_more = len(rows) > limit
    items = rows[:limit]
    next_cursor = items[-1].id if has_more and items else None
    return {
        "items": [row.to_dict() for row in items],
        "next_cursor": str(next_cursor) if next_cursor is not None else None,
        "has_more": bool(has_more),
    }


def search_entities_cursor(
    *,
    query_text: str,
    limit: int = 20,
    cursor: int | None = None,
) -> dict[str, Any]:
    if not query_text:
        return {"items": [], "next_cursor": None, "has_more": False}

    query = GraphEntity.query.filter(GraphEntity.canonical_name.ilike(f"%{query_text}%"))
    if cursor is not None:
        query = query.filter(GraphEntity.id < int(cursor))
    rows = query.order_by(GraphEntity.id.desc()).limit(limit + 1).all()
    has_more = len(rows) > limit
    items = rows[:limit]
    next_cursor = items[-1].id if has_more and items else None
    return {
        "items": [row.to_dict() for row in items],
        "next_cursor": str(next_cursor) if next_cursor is not None else None,
        "has_more": bool(has_more),
    }
