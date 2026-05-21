from __future__ import annotations

from typing import Any

from ..extensions import db
from ..models import Encounter, HallParticipant, MoodBoard, PathWalk, SharedSpace
from ..time_utils import now_utc
from .presence_seed_service import BASE_STRENGTHS, seeds_from_shared_space, serialize_seed
from .presence_service import PresenceValidationError
from .presence_social_service import json_object, validate_choice


SPACE_TYPES = {"room", "hall", "hall_table", "path", "event", "place", "mood_board", "observation_thread", "encounter"}


def record_shared_space(
    *,
    space_type: str,
    space_id: int | None = None,
    observer=None,
    room=None,
    hall=None,
    path=None,
    event_id: int | None = None,
    strength: float | None = None,
    occurred_at=None,
    metadata: dict[str, Any] | None = None,
    create_seed: bool = True,
) -> SharedSpace:
    space_type = validate_choice(space_type, SPACE_TYPES, field="space_type")
    row = SharedSpace(
        space_type=space_type,
        space_id=space_id,
        observer_id=getattr(observer, "id", None),
        room_id=getattr(room, "id", None),
        hall_id=getattr(hall, "id", None),
        path_id=getattr(path, "id", None),
        event_id=event_id,
        strength=strength if strength is not None else _default_strength(space_type, metadata),
        occurred_at=occurred_at or now_utc(),
        metadata_json=json_object(metadata),
    )
    db.session.add(row)
    db.session.flush()
    if create_seed and row.observer_id:
        seeds_from_shared_space(row)
    return row


def derive_shared_space_from_room_entry(encounter: Encounter) -> SharedSpace | None:
    if not encounter.observer:
        return None
    source_type = "nfc_encounter" if encounter.source == "nfc" else "qr_encounter" if encounter.source == "qr" else "same_room"
    return record_shared_space(
        space_type="encounter",
        space_id=encounter.id,
        observer=encounter.observer,
        room=encounter.room,
        strength=BASE_STRENGTHS.get(source_type, 60),
        occurred_at=encounter.created_at,
        metadata={"encounter_id": encounter.id, "source": encounter.source, "privacy_level": encounter.privacy_level},
    )


def derive_shared_space_from_hall_join(participant: HallParticipant) -> SharedSpace | None:
    if not participant.observer:
        return None
    return record_shared_space(
        space_type="hall",
        space_id=participant.hall_id,
        observer=participant.observer,
        hall=participant.hall,
        strength=BASE_STRENGTHS["same_hall"],
        occurred_at=participant.joined_at,
        metadata={"participant_id": participant.id, "session_id": participant.session_id, "role": participant.role},
    )


def derive_shared_space_from_path_walk(walk: PathWalk) -> SharedSpace | None:
    if not walk.observer:
        return None
    return record_shared_space(
        space_type="path",
        space_id=walk.path_id,
        observer=walk.observer,
        path=walk.path,
        strength=BASE_STRENGTHS["same_path"],
        occurred_at=walk.started_at,
        metadata={"path_walk_id": walk.id, "saved": bool(walk.saved)},
    )


def derive_shared_space_from_mood_board_overlap(observer, board: MoodBoard, *, overlap_score: float = 1.0) -> SharedSpace:
    if not observer:
        raise PresenceValidationError("observer is required.")
    strength = max(10.0, min(BASE_STRENGTHS["mood_board_overlap"] * float(overlap_score or 1), 75.0))
    return record_shared_space(
        space_type="mood_board",
        space_id=board.id,
        observer=observer,
        strength=strength,
        metadata={"mood_board_id": board.id, "overlap_score": overlap_score},
    )


def create_seeds_from_shared_space(shared_space: SharedSpace) -> list[dict[str, Any]]:
    return [serialize_seed(seed) for seed in seeds_from_shared_space(shared_space)]


def serialize_shared_space(row: SharedSpace) -> dict[str, Any]:
    return {
        "id": row.id,
        "space_type": row.space_type,
        "space_id": row.space_id,
        "observer_id": row.observer_id,
        "room_id": row.room_id,
        "hall_id": row.hall_id,
        "path_id": row.path_id,
        "event_id": row.event_id,
        "strength": float(row.strength or 0),
        "occurred_at": row.occurred_at.isoformat() if row.occurred_at else None,
        "metadata": row.metadata_json or {},
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _default_strength(space_type: str, metadata: dict[str, Any] | None = None) -> float:
    source = (metadata or {}).get("source")
    if space_type == "encounter" and source == "nfc":
        return BASE_STRENGTHS["nfc_encounter"]
    if space_type == "encounter" and source == "qr":
        return BASE_STRENGTHS["qr_encounter"]
    if space_type == "hall_table":
        return BASE_STRENGTHS["same_table"]
    if space_type == "hall":
        return BASE_STRENGTHS["same_hall"]
    if space_type == "path":
        return BASE_STRENGTHS["same_path"]
    if space_type == "mood_board":
        return BASE_STRENGTHS["mood_board_overlap"]
    if space_type == "event":
        return BASE_STRENGTHS["same_event"]
    if space_type == "place":
        return BASE_STRENGTHS["same_place"]
    return BASE_STRENGTHS["same_room"]
