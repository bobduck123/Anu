from __future__ import annotations

from typing import Any

from ...extensions import db
from ...time_utils import now_utc
from sqlalchemy.exc import IntegrityError
from ...models import (
    FusedEvent,
    GraphClaim,
    GraphEdge,
    GraphEntity,
    GraphEventLink,
    GraphEvidence,
    UniversalEventObject,
)


def resolve_entity(entity_ref: dict[str, Any]) -> GraphEntity:
    canonical_name = (entity_ref.get("name") or "").strip()
    if not canonical_name:
        canonical_name = "Unknown Entity"
    entity_type = entity_ref.get("entity_type") or "topic"
    external_ids = entity_ref.get("external_ids") or {}

    existing = (
        GraphEntity.query.filter(
            db.func.lower(GraphEntity.canonical_name) == canonical_name.lower(),
            GraphEntity.entity_type == entity_type,
        )
        .order_by(GraphEntity.id.asc())
        .first()
    )
    if existing:
        merged = dict(existing.external_ids_json or {})
        merged.update(external_ids)
        existing.external_ids_json = merged
        aliases = set(existing.aliases_json or [])
        aliases.update(entity_ref.get("aliases") or [])
        existing.aliases_json = sorted(aliases) if aliases else []
        db.session.flush()
        return existing

    entity = GraphEntity(
        canonical_name=canonical_name,
        entity_type=entity_type,
        external_ids_json=external_ids,
        aliases_json=entity_ref.get("aliases") or [],
        metadata_json=entity_ref.get("metadata") or {},
    )
    db.session.add(entity)
    db.session.flush()
    return entity


def link_event_entities(
    fused_event: FusedEvent,
    ueo: UniversalEventObject,
    entity_refs: list[dict[str, Any]],
) -> list[GraphEntity]:
    entities: list[GraphEntity] = []
    for ref in entity_refs:
        entity = resolve_entity(ref)
        entities.append(entity)
        existing_link = GraphEventLink.query.filter_by(
            entity_id=entity.id, fused_event_id=fused_event.id
        ).first()
        if not existing_link:
            try:
                with db.session.begin_nested():
                    db.session.add(
                        GraphEventLink(
                            entity_id=entity.id,
                            fused_event_id=fused_event.id,
                            link_role=ref.get("role"),
                        )
                    )
                    db.session.flush()
            except IntegrityError:
                pass

        claim = GraphClaim.query.filter_by(
            entity_id=entity.id,
            claim_text=fused_event.canonical_title,
        ).first()
        if not claim:
            claim = GraphClaim(
                entity_id=entity.id,
                claim_text=fused_event.canonical_title,
                status="candidate",
                confidence=fused_event.confidence,
            )
            db.session.add(claim)
            db.session.flush()

        db.session.add(
            GraphEvidence(
                claim_id=claim.id,
                fused_event_id=fused_event.id,
                ueo_id=ueo.id,
                excerpt=ueo.summary or ueo.title,
                evidence_type="signal",
                reliability_score=ueo.confidence,
            )
        )

    for i, source in enumerate(entities):
        for target in entities[i + 1 :]:
            edge = GraphEdge.query.filter_by(
                source_entity_id=source.id,
                target_entity_id=target.id,
                relation_type="co_occurs_with",
            ).first()
            if edge:
                edge.weight = min(1.0, float(edge.weight or 0) + 0.05)
            else:
                db.session.add(
                    GraphEdge(
                        source_entity_id=source.id,
                        target_entity_id=target.id,
                        relation_type="co_occurs_with",
                        weight=0.55,
                        metadata_json={"derived_from": "fused_event", "at": now_utc().isoformat()},
                    )
                )
    db.session.flush()
    return entities


def get_entity_neighborhood(entity_id: int, limit: int = 25) -> dict[str, Any]:
    entity = db.session.get(GraphEntity, entity_id)
    if not entity:
        return {"entity": None, "neighbors": []}

    outgoing = GraphEdge.query.filter_by(source_entity_id=entity.id).limit(limit).all()
    incoming = GraphEdge.query.filter_by(target_entity_id=entity.id).limit(limit).all()
    edge_rows = outgoing + incoming
    neighbor_ids = set()
    for edge in edge_rows:
        neighbor_ids.add(edge.source_entity_id)
        neighbor_ids.add(edge.target_entity_id)
    neighbor_ids.discard(entity.id)
    neighbors = GraphEntity.query.filter(GraphEntity.id.in_(neighbor_ids)).all() if neighbor_ids else []

    return {
        "entity": entity.to_dict(),
        "edges": [edge.to_dict() for edge in edge_rows],
        "neighbors": [node.to_dict() for node in neighbors],
    }


def get_entity_timeline(entity_id: int, limit: int = 50) -> list[dict[str, Any]]:
    links = (
        GraphEventLink.query.filter_by(entity_id=entity_id)
        .order_by(GraphEventLink.id.desc())
        .limit(limit)
        .all()
    )
    event_ids = [link.fused_event_id for link in links]
    if not event_ids:
        return []
    events = (
        FusedEvent.query.filter(FusedEvent.id.in_(event_ids))
        .order_by(FusedEvent.occurred_at.desc())
        .all()
    )
    return [event.to_dict() for event in events]


def get_entity_evidence(entity_id: int, limit: int = 100) -> list[dict[str, Any]]:
    claims = GraphClaim.query.filter_by(entity_id=entity_id).all()
    if not claims:
        return []
    claim_ids = [claim.id for claim in claims]
    rows = (
        GraphEvidence.query.filter(GraphEvidence.claim_id.in_(claim_ids))
        .order_by(GraphEvidence.created_at.desc())
        .limit(limit)
        .all()
    )
    return [row.to_dict() for row in rows]
