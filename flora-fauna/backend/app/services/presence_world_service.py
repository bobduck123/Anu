from __future__ import annotations

from decimal import Decimal
from typing import Any

from sqlalchemy import func

from ..extensions import db
from ..models import (
    Encounter,
    FieldNote,
    MoodBoard,
    Path,
    PathTrace,
    PresenceNode,
    RoomConnection,
    RoomKey,
    WorldReadinessMetric,
)
from ..time_utils import now_utc
from .presence_pass_service import serialize_encounter, serialize_room_key
from .presence_social_service import serialize_field_note, serialize_room_connection, summarise_signals_for_room


WORLD_FORMING_COPY = "The World is forming. Rooms will open into a shared map once enough places, paths, and traces exist."

DEFAULT_THRESHOLDS = {
    "active_rooms_count": 75,
    "active_observers_count": 500,
    "encounters_count": 1000,
    "saved_rooms_count": 1500,
    "mood_boards_count": 300,
    "paths_count": 50,
    "cross_room_connections_count": 30,
}


def owner_room_dashboard(room: PresenceNode) -> dict[str, Any]:
    encounters = Encounter.query.filter_by(room_id=room.id).count()
    saves = RoomConnection.query.filter(RoomConnection.room_id == room.id, RoomConnection.status.in_(["saved", "followed", "revealed", "enquired"])).count()
    notes = FieldNote.query.filter_by(room_id=room.id).count()
    path_traces = (
        db.session.query(func.count(PathTrace.id))
        .join(Path, Path.id == PathTrace.path_id)
        .filter(Path.trailhead_type == "room", Path.trailhead_id == room.id)
        .scalar()
        or 0
    )
    keys = RoomKey.query.filter_by(room_id=room.id).all()
    key_payloads = []
    for key in keys:
        key_payload = serialize_room_key(key, include_token=False)
        key_payload["encounters_count"] = Encounter.query.filter_by(room_key_id=key.id).count()
        key_payloads.append(key_payload)
    return {
        "room_id": room.id,
        "slug": room.slug,
        "encounters_count": encounters,
        "saved_rooms_count": saves,
        "field_notes_count": notes,
        "path_activity_count": int(path_traces),
        "signals": summarise_signals_for_room(room),
        "room_key_performance": key_payloads,
    }


def room_encounters_for_owner(room: PresenceNode, *, limit: int = 50) -> list[dict[str, Any]]:
    rows = Encounter.query.filter_by(room_id=room.id).order_by(Encounter.created_at.desc()).limit(max(1, min(limit, 100))).all()
    return [serialize_encounter(row, owner_view=True) for row in rows]


def room_connections_for_owner(room: PresenceNode, *, limit: int = 50) -> list[dict[str, Any]]:
    rows = RoomConnection.query.filter_by(room_id=room.id).order_by(RoomConnection.last_interaction_at.desc().nullslast(), RoomConnection.created_at.desc()).limit(max(1, min(limit, 100))).all()
    return [serialize_room_connection(row, owner_view=True) for row in rows]


def room_field_notes_for_owner(room: PresenceNode, *, limit: int = 50) -> list[dict[str, Any]]:
    rows = FieldNote.query.filter_by(room_id=room.id).order_by(FieldNote.created_at.desc()).limit(max(1, min(limit, 100))).all()
    return [serialize_field_note(row) for row in rows]


def compute_world_readiness(scope_type: str = "global", scope_id: str | None = None) -> WorldReadinessMetric:
    active_rooms_count = PresenceNode.query.filter(
        PresenceNode.status == "published",
        PresenceNode.visibility == "public",
    ).count()
    active_observers_count = RoomConnection.query.with_entities(RoomConnection.observer_id).distinct().count()
    encounters_count = Encounter.query.count()
    saved_rooms_count = RoomConnection.query.filter(RoomConnection.status.in_(["saved", "followed", "revealed", "enquired"])).count()
    mood_boards_count = MoodBoard.query.filter_by(status="active").count()
    field_notes_count = FieldNote.query.filter(FieldNote.status.in_(["active", "flagged"])).count()
    paths_count = Path.query.filter_by(status="active").count()
    cross_room_connections_count = _cross_room_connection_count()
    values = {
        "active_rooms_count": active_rooms_count,
        "active_observers_count": active_observers_count,
        "encounters_count": encounters_count,
        "saved_rooms_count": saved_rooms_count,
        "mood_boards_count": mood_boards_count,
        "field_notes_count": field_notes_count,
        "paths_count": paths_count,
        "cross_room_connections_count": cross_room_connections_count,
    }
    readiness_score = _readiness_score(values)
    status = _readiness_status(readiness_score, values)
    row = WorldReadinessMetric(
        scope_type=scope_type,
        scope_id=scope_id,
        readiness_score=Decimal(str(round(readiness_score, 3))),
        status=status,
        computed_at=now_utc(),
        **values,
    )
    db.session.add(row)
    return row


def get_world_status(scope_type: str = "global", scope_id: str | None = None) -> dict[str, Any]:
    row = (
        WorldReadinessMetric.query.filter_by(scope_type=scope_type, scope_id=scope_id)
        .order_by(WorldReadinessMetric.computed_at.desc(), WorldReadinessMetric.id.desc())
        .first()
    )
    if not row:
        row = compute_world_readiness(scope_type=scope_type, scope_id=scope_id)
        db.session.flush()
    return serialize_world_readiness(row, public_safe=True)


def serialize_world_readiness(row: WorldReadinessMetric, *, public_safe: bool = False) -> dict[str, Any]:
    payload = {
        "id": row.id,
        "scope_type": row.scope_type,
        "scope_id": row.scope_id,
        "status": row.status if not public_safe or row.status in {"hidden", "forming", "preview"} else "forming",
        "readiness_score": float(row.readiness_score or 0),
        "computed_at": row.computed_at.isoformat() if row.computed_at else None,
        "message": WORLD_FORMING_COPY,
    }
    if not public_safe:
        payload.update(
            {
                "active_rooms_count": row.active_rooms_count,
                "active_observers_count": row.active_observers_count,
                "encounters_count": row.encounters_count,
                "saved_rooms_count": row.saved_rooms_count,
                "mood_boards_count": row.mood_boards_count,
                "field_notes_count": row.field_notes_count,
                "paths_count": row.paths_count,
                "cross_room_connections_count": row.cross_room_connections_count,
                "thresholds": DEFAULT_THRESHOLDS,
            }
        )
    return payload


def graph_summary_for_room(room: PresenceNode) -> dict[str, Any]:
    return {
        "room": {"id": room.id, "slug": room.slug, "display_name": room.display_name},
        "dashboard": owner_room_dashboard(room),
        "world_status": get_world_status(),
        "message": WORLD_FORMING_COPY,
    }


def _readiness_score(values: dict[str, int]) -> float:
    total = 0.0
    count = 0
    for key, threshold in DEFAULT_THRESHOLDS.items():
        count += 1
        total += min(float(values.get(key, 0)) / float(threshold), 1.0)
    return total / max(count, 1)


def _readiness_status(score: float, values: dict[str, int]) -> str:
    if score >= 1.0 and all(values.get(key, 0) >= threshold for key, threshold in DEFAULT_THRESHOLDS.items()):
        return "ready"
    if score >= 0.65:
        return "preview"
    if score >= 0.15:
        return "forming"
    return "hidden"


def _cross_room_connection_count() -> int:
    rows = (
        db.session.query(RoomConnection.observer_id)
        .group_by(RoomConnection.observer_id)
        .having(func.count(RoomConnection.room_id) > 1)
        .all()
    )
    return len(rows)

