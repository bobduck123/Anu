from __future__ import annotations

from typing import Any

from ..extensions import db
from ..models import (
    GardenNurture,
    GardenSeed,
    MoodBoard,
    Observation,
    ObservationEcho,
    Path,
    PresenceHall,
    PresenceNode,
)
from .presence_garden_service import get_or_create_default_garden
from .presence_seed_service import create_or_update_seed, nurture_seed, serialize_seed
from .presence_service import PresenceValidationError, serialize_public_card
from .presence_social_service import clean_str, clean_text, json_object, serialize_mood_board, serialize_observer_profile, validate_choice
from .presence_upgrade_guard_service import validate_observer_no_self_promotion


OBSERVATION_TYPES = {"text", "room", "path", "field", "mood", "echo", "find", "walk_log", "guestbook", "hall"}
OBSERVATION_VISIBILITIES = {"public", "garden", "hall", "room_owner_only", "private", "unlisted"}
OBSERVATION_STATUSES = {"active", "hidden", "flagged", "removed"}
MODERATION_STATES = {"clean", "pending", "flagged", "actioned"}
ECHO_VISIBILITIES = {"public", "private", "unlisted"}
ECHO_STATUSES = {"active", "hidden", "removed"}


def create_observation(observer, data: dict[str, Any], *, garden=None, hall=None) -> Observation:
    data = _canonical_observation_payload(data)
    body = clean_text(data.get("body"), 4000)
    title = clean_str(data.get("title"), 180)
    if not body:
        raise PresenceValidationError("body is required.")
    validate_observer_no_self_promotion(title, body, data.get("metadata") or data.get("metadata_json"), field="Observation")

    garden_id = _int_or_none(data.get("garden_id"))
    hall_id = _int_or_none(data.get("hall_id"))
    if hall is not None:
        hall_id = hall.id
    if garden is not None:
        garden_id = garden.id
    if not hall_id and not garden_id:
        garden = get_or_create_default_garden(observer)
        garden_id = garden.id

    room_id = _int_or_none(data.get("room_id"))
    path_id = _int_or_none(data.get("path_id"))
    mood_board_id = _int_or_none(data.get("mood_board_id"))
    _validate_targets(room_id=room_id, path_id=path_id, mood_board_id=mood_board_id, hall_id=hall_id)

    default_type = "hall" if hall_id else "text"
    visibility_default = "hall" if hall_id else "garden"
    observation = Observation(
        author_observer_id=observer.id,
        garden_id=garden_id,
        hall_id=hall_id,
        room_id=room_id,
        path_id=path_id,
        mood_board_id=mood_board_id,
        observation_type=validate_choice(data.get("observation_type"), OBSERVATION_TYPES, field="observation_type", default=default_type),
        body=body,
        title=title,
        visibility=validate_choice(data.get("visibility"), OBSERVATION_VISIBILITIES, field="visibility", default=visibility_default),
        status="active",
        moderation_state="clean",
        metadata_json=json_object(data.get("metadata") or data.get("metadata_json")),
    )
    db.session.add(observation)
    db.session.flush()
    if garden_id:
        _seed_from_observation(observation)
    return observation


def update_observation(observation: Observation, data: dict[str, Any]) -> Observation:
    data = _canonical_observation_payload(data)
    title = clean_str(data.get("title"), 180) if "title" in data else observation.title
    body = clean_text(data.get("body"), 4000) if "body" in data else observation.body
    validate_observer_no_self_promotion(title, body, data.get("metadata") or data.get("metadata_json"), field="Observation")
    if "title" in data:
        observation.title = title
    if "body" in data:
        observation.body = body or observation.body
    if "visibility" in data:
        observation.visibility = validate_choice(data.get("visibility"), OBSERVATION_VISIBILITIES, field="visibility")
    if "observation_type" in data:
        observation.observation_type = validate_choice(data.get("observation_type"), OBSERVATION_TYPES, field="observation_type")
    if "status" in data:
        observation.status = validate_choice(data.get("status"), OBSERVATION_STATUSES, field="status")
    if "moderation_state" in data:
        observation.moderation_state = validate_choice(data.get("moderation_state"), MODERATION_STATES, field="moderation_state")
    if "metadata" in data or "metadata_json" in data:
        observation.metadata_json = json_object(data.get("metadata") or data.get("metadata_json"))
    return observation


def delete_or_hide_observation(observation: Observation, *, hard_delete: bool = False) -> Observation | None:
    if hard_delete:
        db.session.delete(observation)
        return None
    observation.status = "removed"
    observation.moderation_state = "actioned"
    return observation


def list_garden_observations(garden, *, include_private: bool = False, limit: int = 50) -> list[Observation]:
    query = Observation.query.filter_by(garden_id=garden.id).filter(Observation.status == "active")
    if include_private:
        query = query.filter(Observation.visibility.in_(["public", "garden", "private", "unlisted"]))
    else:
        query = query.filter(Observation.visibility.in_(["public", "garden", "unlisted"]))
    return query.order_by(Observation.created_at.desc(), Observation.id.desc()).limit(max(1, min(limit, 100))).all()


def list_hall_observations(hall, *, include_hidden: bool = False, limit: int = 50) -> list[Observation]:
    query = Observation.query.filter_by(hall_id=hall.id)
    if not include_hidden:
        query = query.filter(Observation.status == "active", Observation.visibility.in_(["hall", "public", "unlisted"]))
    return query.order_by(Observation.created_at.desc(), Observation.id.desc()).limit(max(1, min(limit, 100))).all()


def echo_observation(observer, source_observation: Observation, data: dict[str, Any]) -> ObservationEcho:
    if source_observation.status in {"hidden", "removed"} or source_observation.moderation_state == "actioned":
        raise PresenceValidationError("Observation cannot be echoed.")
    commentary = clean_text(data.get("commentary") if "commentary" in data else data.get("message"), 1000)
    validate_observer_no_self_promotion(commentary, field="Echo commentary")
    target_garden = get_or_create_default_garden(observer)
    echo = ObservationEcho(
        observer_id=observer.id,
        source_observation_id=source_observation.id,
        source_room_id=source_observation.room_id,
        source_mood_board_id=source_observation.mood_board_id,
        source_path_id=source_observation.path_id,
        source_hall_id=source_observation.hall_id,
        commentary=commentary,
        target_garden_id=target_garden.id,
        visibility=validate_choice(data.get("visibility"), ECHO_VISIBILITIES, field="visibility", default="public"),
        status="active",
    )
    db.session.add(echo)
    db.session.flush()
    seed = create_or_update_seed(
        target_garden,
        seed_type="observer",
        seed_id=source_observation.author_observer_id,
        source_type="echo",
        source_ref_id=source_observation.id,
        reason_label="You echoed an Observation from this Mask.",
        metadata={"source_observation_id": source_observation.id},
    )
    nurture_seed(target_garden, seed, observer, nurture_type="echo", metadata={"echo_id": echo.id})
    for seed_type, seed_id in (
        ("room", source_observation.room_id),
        ("hall", source_observation.hall_id),
        ("path", source_observation.path_id),
        ("mood_board", source_observation.mood_board_id),
    ):
        if seed_id:
            create_or_update_seed(
                target_garden,
                seed_type=seed_type,
                seed_id=seed_id,
                source_type="echo",
                source_ref_id=source_observation.id,
                reason_label=f"You echoed content attached to this {seed_type.replace('_', ' ')}.",
                metadata={"source_observation_id": source_observation.id, "echo_id": echo.id},
            )
    return echo


def serialize_observation(observation: Observation, *, include_body: bool = True) -> dict[str, Any]:
    author = _author_payload(observation)
    source = _source_payload(observation)
    metadata = observation.metadata_json or {}
    payload = {
        "id": observation.id,
        "author_observer_id": observation.author_observer_id,
        "observer_id": observation.author_observer_id,
        "author_mask": serialize_observer_profile(observation.author_observer, private=False) if observation.author_observer else None,
        "author": author,
        "garden_id": observation.garden_id,
        "hall_id": observation.hall_id,
        "room_id": observation.room_id,
        "path_id": observation.path_id,
        "mood_board_id": observation.mood_board_id,
        "observation_type": observation.observation_type,
        "observation_kind": observation.observation_type,
        "title": observation.title,
        "body": observation.body if include_body else None,
        "body_format": metadata.get("body_format") or "plain",
        "visibility": observation.visibility,
        "source": source,
        "status": observation.status,
        "moderation_state": observation.moderation_state,
        "metadata": metadata,
        "nurture_count": _observation_nurture_count(observation),
        "echo_count": len(observation.echoes or []),
        "reply_count": int(metadata.get("reply_count") or 0),
        "has_nurtured": bool(metadata.get("has_nurtured")),
        "has_echoed": bool(metadata.get("has_echoed")),
        "has_saved": bool(metadata.get("has_saved")),
        "image_url": metadata.get("image_url"),
        "echoed_from_id": metadata.get("echoed_from_id"),
        "echoed_from": None,
        "created_at": observation.created_at.isoformat() if observation.created_at else None,
        "updated_at": observation.updated_at.isoformat() if observation.updated_at else None,
    }
    if observation.room:
        payload["room"] = serialize_public_card(observation.room)
    if observation.mood_board:
        payload["mood_board"] = serialize_mood_board(observation.mood_board)
    return payload


def serialize_echo(echo: ObservationEcho) -> dict[str, Any]:
    source = echo.source_observation
    source_payload = None
    if source and source.status == "active":
        source_payload = {
            "id": source.id,
            "author_observer_id": source.author_observer_id,
            "author_mask": serialize_observer_profile(source.author_observer, private=False) if source.author_observer else None,
            "title": source.title,
            "body": source.body,
            "observation_type": source.observation_type,
            "created_at": source.created_at.isoformat() if source.created_at else None,
        }
    return {
        "id": echo.id,
        "observer_id": echo.observer_id,
        "source_observation_id": echo.source_observation_id,
        "observation_id": echo.source_observation_id,
        "source_room_id": echo.source_room_id,
        "source_mood_board_id": echo.source_mood_board_id,
        "source_path_id": echo.source_path_id,
        "source_hall_id": echo.source_hall_id,
        "source_attribution": source_payload,
        "commentary": echo.commentary,
        "message": echo.commentary,
        "target_garden_id": echo.target_garden_id,
        "visibility": echo.visibility,
        "status": echo.status,
        "created_at": echo.created_at.isoformat() if echo.created_at else None,
        "updated_at": echo.updated_at.isoformat() if echo.updated_at else None,
    }


def _seed_from_observation(observation: Observation) -> list[GardenSeed]:
    if not observation.garden:
        return []
    seeds: list[GardenSeed] = []
    for seed_type, seed_id, reason in (
        ("room", observation.room_id, "Observation attached to this Room."),
        ("hall", observation.hall_id, "Observation attached to this Hall."),
        ("path", observation.path_id, "Observation attached to this Path."),
        ("mood_board", observation.mood_board_id, "Observation attached to this Mood Board."),
        ("observer", observation.author_observer_id, "Observation from this Mask."),
    ):
        if seed_id:
            seeds.append(
                create_or_update_seed(
                    observation.garden,
                    seed_type=seed_type,
                    seed_id=seed_id,
                    source_type="manual" if seed_type == "observer" else "reply",
                    source_ref_id=observation.id,
                    reason_label=reason,
                    metadata={"observation_id": observation.id},
                )
            )
    return seeds


def _validate_targets(*, room_id: int | None, path_id: int | None, mood_board_id: int | None, hall_id: int | None) -> None:
    if room_id and not PresenceNode.query.get(room_id):
        raise PresenceValidationError("Room not found.")
    if path_id and not Path.query.get(path_id):
        raise PresenceValidationError("Path not found.")
    if mood_board_id and not MoodBoard.query.get(mood_board_id):
        raise PresenceValidationError("Mood Board not found.")
    if hall_id and not PresenceHall.query.get(hall_id):
        raise PresenceValidationError("Hall not found.")


def _int_or_none(value: Any) -> int | None:
    try:
        return int(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None


def _canonical_observation_payload(data: dict[str, Any]) -> dict[str, Any]:
    payload = dict(data or {})
    if "observation_type" not in payload and payload.get("observation_kind"):
        payload["observation_type"] = payload.get("observation_kind")
    if payload.get("visibility") == "mask_only":
        payload["visibility"] = "garden"
    source_kind = payload.get("source_kind")
    source_id = _int_or_none(payload.get("source_id"))
    if source_kind and source_id:
        if source_kind == "room" and not payload.get("room_id"):
            payload["room_id"] = source_id
        elif source_kind == "hall" and not payload.get("hall_id"):
            payload["hall_id"] = source_id
        elif source_kind == "path" and not payload.get("path_id"):
            payload["path_id"] = source_id
        elif source_kind == "mood_board" and not payload.get("mood_board_id"):
            payload["mood_board_id"] = source_id
    metadata = json_object(payload.get("metadata") or payload.get("metadata_json"))
    for key in ("body_format", "image_url", "source_slug"):
        if payload.get(key) is not None:
            metadata[key] = payload.get(key)
    if metadata:
        payload["metadata"] = metadata
    return payload


def _author_payload(observation: Observation) -> dict[str, Any] | None:
    observer = observation.author_observer
    if not observer:
        return None
    return {
        "observer_id": observer.id,
        "alias": observer.alias,
        "mask_name": observer.mask_name,
        "avatar_key": observer.avatar_key,
    }


def _source_payload(observation: Observation) -> dict[str, Any] | None:
    if observation.room:
        return {
            "source_kind": "room",
            "source_id": observation.room_id,
            "source_slug": observation.room.slug,
            "source_label": observation.room.display_name,
            "reason_shown": "Attached to a Presence Room.",
        }
    if observation.hall:
        return {
            "source_kind": "hall",
            "source_id": observation.hall_id,
            "source_slug": observation.hall.slug,
            "source_label": observation.hall.title,
            "reason_shown": "Shared in a Presence Hall.",
        }
    if observation.path:
        return {
            "source_kind": "path",
            "source_id": observation.path_id,
            "source_label": observation.path.title,
            "reason_shown": "Attached to a Path.",
        }
    if observation.mood_board:
        return {
            "source_kind": "mood_board",
            "source_id": observation.mood_board_id,
            "source_label": observation.mood_board.title,
            "reason_shown": "Attached to a Mood Board.",
        }
    return None


def _observation_nurture_count(observation: Observation) -> int:
    return (
        GardenNurture.query.join(GardenSeed, GardenNurture.seed_id == GardenSeed.id)
        .filter(GardenSeed.source_ref_id == str(observation.id), GardenNurture.nurture_type.in_(["reply", "echo", "manual_keep_close", "save"]))
        .count()
    )
