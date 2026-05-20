from __future__ import annotations

from typing import Any

from sqlalchemy import or_

from ..extensions import db
from ..models import (
    FieldNote,
    MoodBoard,
    MoodBoardItem,
    PassportStamp,
    Path,
    PathChoice,
    PathTrace,
    PathWalk,
    PathWaypoint,
    PresenceNode,
    RoomConnection,
)
from ..time_utils import now_utc
from .presence_service import PresenceValidationError, public_url_for_node, serialize_public_card
from .presence_social_service import clean_str, json_object, passport_stamp, validate_choice


PATH_TYPES = {"mood", "place", "influence", "material", "sound", "people", "event", "editorial", "generated", "encounter"}
TRAILHEAD_TYPES = {"room", "mood_board", "event", "place", "encounter", "tag", "influence", "observer"}
PATH_GENERATORS = {"system", "editor", "observer", "room_owner"}
PATH_VISIBILITIES = {"private", "public", "unlisted", "system"}
PATH_STATUSES = {"draft", "active", "archived"}
WAYPOINT_TYPES = {"room", "field_note", "mood_board_item", "mood_board", "event", "place", "reference", "text"}
CHOICE_DIRECTIONS = {"sound", "material", "place", "people", "influence", "event", "mood", "surprise", "collaborator", "saved_by"}
TRACE_TYPES = {"view", "enter_room", "save", "signal", "field_note", "linger", "skip", "return", "fork_chosen"}


def public_room_query():
    return PresenceNode.query.filter(
        PresenceNode.status == "published",
        PresenceNode.visibility == "public",
        or_(PresenceNode.public_status == "public", PresenceNode.public_status.is_(None)),
    )


def create_path(data: dict[str, Any]) -> Path:
    title = clean_str(data.get("title"), 180)
    if not title:
        raise PresenceValidationError("title is required.")
    path = Path(
        title=title,
        description=clean_str(data.get("description"), 2000),
        path_type=validate_choice(data.get("path_type"), PATH_TYPES, field="path_type", default="generated"),
        trailhead_type=validate_choice(data.get("trailhead_type"), TRAILHEAD_TYPES, field="trailhead_type", default="room"),
        trailhead_id=_int_or_none(data.get("trailhead_id")),
        generated_by=validate_choice(data.get("generated_by"), PATH_GENERATORS, field="generated_by", default="system"),
        visibility=validate_choice(data.get("visibility"), PATH_VISIBILITIES, field="visibility", default="unlisted"),
        status=validate_choice(data.get("status"), PATH_STATUSES, field="status", default="active"),
        mood_tags_json=_list_or_empty(data.get("mood_tags") or data.get("mood_tags_json")),
        place_tags_json=_list_or_empty(data.get("place_tags") or data.get("place_tags_json")),
        metadata_json=json_object(data.get("metadata") or data.get("metadata_json")),
    )
    db.session.add(path)
    return path


def add_waypoint(path: Path, waypoint_type: str, *, waypoint_id: int | None = None, title: str | None = None, reason_shown: str | None = None, order_index: int = 0, metadata: dict | None = None) -> PathWaypoint:
    waypoint = PathWaypoint(
        path_id=path.id,
        waypoint_type=validate_choice(waypoint_type, WAYPOINT_TYPES, field="waypoint_type"),
        waypoint_id=waypoint_id,
        title=clean_str(title, 180),
        reason_shown=clean_str(reason_shown, 700),
        order_index=order_index,
        metadata_json=json_object(metadata),
    )
    db.session.add(waypoint)
    return waypoint


def add_choice(path: Path, from_waypoint: PathWaypoint, label: str, direction_type: str, *, next_waypoint: PathWaypoint | None = None, metadata: dict | None = None) -> PathChoice:
    choice = PathChoice(
        path_id=path.id,
        from_waypoint_id=from_waypoint.id,
        label=clean_str(label, 120) or "Choose a direction.",
        direction_type=validate_choice(direction_type, CHOICE_DIRECTIONS, field="direction_type"),
        next_waypoint_id=getattr(next_waypoint, "id", None),
        metadata_json=json_object(metadata),
    )
    db.session.add(choice)
    return choice


def generate_path_from_room(room: PresenceNode, *, generated_by: str = "system", visibility: str = "unlisted") -> Path:
    path = create_path(
        {
            "title": f"Path from {room.display_name}",
            "description": "Choose a direction.",
            "path_type": "generated",
            "trailhead_type": "room",
            "trailhead_id": room.id,
            "generated_by": generated_by,
            "visibility": visibility,
            "metadata": {"source": "room", "room_id": room.id},
        }
    )
    db.session.flush()
    waypoints: list[PathWaypoint] = []
    waypoints.append(
        add_waypoint(
            path,
            "room",
            waypoint_id=room.id,
            title=room.display_name,
            reason_shown="Trailhead Room.",
            order_index=0,
            metadata={"public_url": public_url_for_node(room)},
        )
    )

    order = 1
    for note in FieldNote.query.filter_by(room_id=room.id, visibility="public", status="active").order_by(FieldNote.created_at.desc()).limit(3).all():
        waypoints.append(add_waypoint(path, "field_note", waypoint_id=note.id, title="Field Note", reason_shown="A trace left on this Room.", order_index=order))
        order += 1

    for item in _room_board_items(room)[:4]:
        waypoints.append(
            add_waypoint(
                path,
                "mood_board_item",
                waypoint_id=item.id,
                title=item.title or "Influence",
                reason_shown="An influence or reference from this Room.",
                order_index=order,
            )
        )
        order += 1

    for related in _related_rooms(room)[:5]:
        waypoints.append(
            add_waypoint(
                path,
                "room",
                waypoint_id=related.id,
                title=related.display_name,
                reason_shown=_related_reason(room, related),
                order_index=order,
                metadata={"public_url": public_url_for_node(related)},
            )
        )
        order += 1

    _add_standard_choices(path, waypoints)
    return path


def generate_path_from_mood_board(board: MoodBoard, *, generated_by: str = "system", visibility: str = "unlisted") -> Path:
    path = create_path(
        {
            "title": f"Path from {board.title}",
            "description": "Choose a direction.",
            "path_type": board.board_type if board.board_type in PATH_TYPES else "mood",
            "trailhead_type": "mood_board",
            "trailhead_id": board.id,
            "generated_by": generated_by,
            "visibility": visibility,
            "metadata": {"source": "mood_board", "mood_board_id": board.id},
        }
    )
    db.session.flush()
    waypoints = [
        add_waypoint(path, "mood_board", waypoint_id=board.id, title=board.title, reason_shown="Trailhead mood board.", order_index=0)
    ]
    order = 1
    anchor_rooms: list[PresenceNode] = []
    for item in sorted(board.items, key=lambda item: (item.position_index or 0, item.id or 0)):
        if item.item_type == "room" and item.item_id:
            room = public_room_query().filter_by(id=item.item_id).first()
            if room:
                anchor_rooms.append(room)
                waypoints.append(
                    add_waypoint(
                        path,
                        "room",
                        waypoint_id=room.id,
                        title=room.display_name,
                        reason_shown="Saved on this mood board.",
                        order_index=order,
                        metadata={"public_url": public_url_for_node(room)},
                    )
                )
                order += 1
        elif item.item_type not in {"external_link", "image"} or board.visibility in {"public", "room_public", "unlisted"}:
            waypoints.append(add_waypoint(path, "mood_board_item", waypoint_id=item.id, title=item.title or "Reference", reason_shown="Context from this mood board.", order_index=order))
            order += 1
    seen = {room.id for room in anchor_rooms}
    for room in anchor_rooms:
        for related in _related_rooms(room):
            if related.id not in seen:
                seen.add(related.id)
                waypoints.append(add_waypoint(path, "room", waypoint_id=related.id, title=related.display_name, reason_shown=_related_reason(room, related), order_index=order, metadata={"public_url": public_url_for_node(related)}))
                order += 1
            if order >= 10:
                break
        if order >= 10:
            break
    _add_standard_choices(path, waypoints, board_mode=True)
    return path


def _room_board_items(room: PresenceNode) -> list[MoodBoardItem]:
    boards = MoodBoard.query.filter(
        MoodBoard.room_id == room.id,
        MoodBoard.status == "active",
        MoodBoard.visibility.in_(["room_public", "public", "unlisted"]),
    ).all()
    items: list[MoodBoardItem] = []
    for board in boards:
        items.extend(sorted(board.items, key=lambda item: (item.position_index or 0, item.id or 0)))
    return items


def _related_rooms(room: PresenceNode) -> list[PresenceNode]:
    query = public_room_query().filter(PresenceNode.id != room.id)
    filters = []
    if room.location_label:
        filters.append(PresenceNode.location_label == room.location_label)
    if room.room_type:
        filters.append(PresenceNode.room_type == room.room_type)
    if room.node_type:
        filters.append(PresenceNode.node_type == room.node_type)
    if room.theme_preset:
        filters.append(PresenceNode.theme_preset == room.theme_preset)
    related = query.filter(or_(*filters)).limit(12).all() if filters else []
    seen = {row.id for row in related}

    saver_ids = [row.observer_id for row in RoomConnection.query.filter_by(room_id=room.id).filter(RoomConnection.status.in_(["saved", "followed", "revealed", "enquired"])).limit(50).all()]
    if saver_ids:
        saved_related = (
            public_room_query()
            .join(RoomConnection, RoomConnection.room_id == PresenceNode.id)
            .filter(RoomConnection.observer_id.in_(saver_ids), PresenceNode.id != room.id)
            .limit(12)
            .all()
        )
        for candidate in saved_related:
            if candidate.id not in seen:
                related.append(candidate)
                seen.add(candidate.id)

    if len(related) < 4:
        for candidate in public_room_query().filter(PresenceNode.id != room.id).order_by(PresenceNode.created_at.asc()).limit(8).all():
            if candidate.id not in seen:
                related.append(candidate)
                seen.add(candidate.id)
    return related


def _related_reason(source: PresenceNode, candidate: PresenceNode) -> str:
    if source.location_label and source.location_label == candidate.location_label:
        return f"Shares place context: {source.location_label}."
    if source.room_type and source.room_type == candidate.room_type:
        return "Shares a Room type."
    if source.theme_preset and source.theme_preset == candidate.theme_preset:
        return "Shares a visual atmosphere."
    return "Underexposed Room surfaced for exploration."


def _add_standard_choices(path: Path, waypoints: list[PathWaypoint], *, board_mode: bool = False) -> None:
    if not waypoints:
        return
    head = waypoints[0]
    labels = [
        ("Follow the place", "place"),
        ("Follow the mood", "mood"),
        ("Follow the influences", "influence"),
        ("Follow similar Rooms", "people"),
        ("Follow people who saved this", "saved_by"),
        ("Surprise me", "surprise"),
    ]
    if board_mode:
        labels = [
            ("More like this", "mood"),
            ("Same place", "place"),
            ("Shared influence", "influence"),
            ("Underexposed Rooms", "surprise"),
            ("Recently active", "event"),
        ]
    for index, (label, direction) in enumerate(labels):
        next_waypoint = waypoints[(index + 1) % len(waypoints)] if len(waypoints) > 1 else head
        add_choice(path, head, label, direction, next_waypoint=next_waypoint, metadata={"copy": "Choose a direction."})


def start_path_walk(observer, path: Path, data: dict[str, Any] | None = None) -> PathWalk:
    walk = PathWalk(observer_id=observer.id, path_id=path.id, saved=bool((data or {}).get("saved")), metadata_json=json_object((data or {}).get("metadata")))
    db.session.add(walk)
    passport_stamp(observer, "followed_path", path_id=path.id, label=path.title)
    return walk


def complete_path_walk(walk: PathWalk, data: dict[str, Any] | None = None) -> PathWalk:
    payload = data or {}
    if payload.get("abandoned"):
        walk.abandoned_at = now_utc()
    else:
        walk.completed_at = now_utc()
    if "saved" in payload:
        walk.saved = bool(payload.get("saved"))
    if "conversion_event" in payload:
        walk.conversion_event = clean_str(payload.get("conversion_event"), 80)
    return walk


def record_path_trace(observer, path: Path, data: dict[str, Any]) -> PathTrace:
    trace_type = validate_choice(data.get("trace_type"), TRACE_TYPES, field="trace_type")
    trace = PathTrace(
        observer_id=observer.id,
        path_id=path.id,
        waypoint_id=_int_or_none(data.get("waypoint_id")),
        trace_type=trace_type,
        metadata_json=json_object(data.get("metadata") or data.get("metadata_json")),
    )
    db.session.add(trace)
    return trace


def choose_fork(observer, path: Path, data: dict[str, Any]) -> PathTrace:
    choice_id = _int_or_none(data.get("choice_id"))
    choice = PathChoice.query.get(choice_id) if choice_id else None
    if not choice or choice.path_id != path.id:
        raise PresenceValidationError("Path choice not found.")
    return record_path_trace(
        observer,
        path,
        {
            "trace_type": "fork_chosen",
            "waypoint_id": choice.from_waypoint_id,
            "metadata": {"choice_id": choice.id, "direction_type": choice.direction_type, "label": choice.label},
        },
    )


def serialize_path(path: Path, *, include_steps: bool = True) -> dict[str, Any]:
    payload = {
        "id": path.id,
        "title": path.title,
        "description": path.description,
        "path_type": path.path_type,
        "trailhead_type": path.trailhead_type,
        "trailhead_id": path.trailhead_id,
        "generated_by": path.generated_by,
        "visibility": path.visibility,
        "status": path.status,
        "mood_tags": path.mood_tags_json or [],
        "place_tags": path.place_tags_json or [],
        "metadata": path.metadata_json or {},
        "created_at": path.created_at.isoformat() if path.created_at else None,
        "updated_at": path.updated_at.isoformat() if path.updated_at else None,
        "copy": "Choose a direction.",
    }
    if include_steps:
        payload["waypoints"] = [serialize_waypoint(item) for item in sorted(path.waypoints, key=lambda item: item.order_index)]
        payload["choices"] = [serialize_choice(item) for item in sorted(path.choices, key=lambda item: item.id or 0)]
    return payload


def serialize_waypoint(item: PathWaypoint) -> dict[str, Any]:
    return {
        "id": item.id,
        "path_id": item.path_id,
        "waypoint_type": item.waypoint_type,
        "waypoint_id": item.waypoint_id,
        "title": item.title,
        "reason_shown": item.reason_shown,
        "order_index": item.order_index,
        "metadata": item.metadata_json or {},
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def serialize_choice(item: PathChoice) -> dict[str, Any]:
    return {
        "id": item.id,
        "path_id": item.path_id,
        "from_waypoint_id": item.from_waypoint_id,
        "label": item.label,
        "direction_type": item.direction_type,
        "next_path_id": item.next_path_id,
        "next_waypoint_id": item.next_waypoint_id,
        "metadata": item.metadata_json or {},
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def serialize_path_walk(walk: PathWalk) -> dict[str, Any]:
    return {
        "id": walk.id,
        "observer_id": walk.observer_id,
        "path_id": walk.path_id,
        "started_at": walk.started_at.isoformat() if walk.started_at else None,
        "completed_at": walk.completed_at.isoformat() if walk.completed_at else None,
        "abandoned_at": walk.abandoned_at.isoformat() if walk.abandoned_at else None,
        "saved": bool(walk.saved),
        "conversion_event": walk.conversion_event,
        "metadata": walk.metadata_json or {},
    }


def serialize_path_trace(trace: PathTrace) -> dict[str, Any]:
    return {
        "id": trace.id,
        "observer_id": trace.observer_id,
        "path_id": trace.path_id,
        "waypoint_id": trace.waypoint_id,
        "trace_type": trace.trace_type,
        "metadata": trace.metadata_json or {},
        "created_at": trace.created_at.isoformat() if trace.created_at else None,
    }


def _list_or_empty(value: Any) -> list:
    return value if isinstance(value, list) else []


def _int_or_none(value: Any) -> int | None:
    try:
        return int(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None

