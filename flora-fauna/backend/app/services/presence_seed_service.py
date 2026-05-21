from __future__ import annotations

import math
from datetime import timedelta
from typing import Any

from ..extensions import db
from ..models import GardenNurture, GardenPrune, GardenSeed, ModerationFlag, MoodBoard, ObserverProfile, Path, PresenceGarden, PresenceHall, PresenceNode, SharedSpace
from ..time_utils import now_utc
from .presence_service import PresenceValidationError
from .presence_social_service import clean_str, clean_text, json_object, validate_choice


SEED_TYPES = {"observer", "room", "hall", "path", "mood_board", "event", "place", "shared_space", "tag"}
SEED_SOURCE_TYPES = {
    "nfc_encounter",
    "qr_encounter",
    "same_room",
    "same_hall",
    "same_table",
    "same_path",
    "same_event",
    "same_place",
    "mood_board_overlap",
    "echo",
    "reply",
    "signal",
    "editorial",
    "algorithmic_similarity",
    "manual",
}
SEED_STATUSES = {"active", "wilting", "composted", "pruned", "blocked"}
NURTURE_TYPES = {
    "save",
    "echo",
    "reply",
    "field_note",
    "signal",
    "mood_board_add",
    "path_walk",
    "room_return",
    "hall_join",
    "follow",
    "manual_keep_close",
}
PRUNE_TYPES = {"see_less", "mute", "prune", "block", "report", "not_for_my_garden"}

BASE_STRENGTHS = {
    "mutual_contact_reveal": 100.0,
    "nfc_encounter": 90.0,
    "qr_encounter": 90.0,
    "same_table": 85.0,
    "same_event": 75.0,
    "same_place": 75.0,
    "same_hall": 70.0,
    "same_room": 60.0,
    "same_path": 55.0,
    "mood_board_overlap": 45.0,
    "echo": 40.0,
    "reply": 40.0,
    "signal": 40.0,
    "algorithmic_similarity": 20.0,
    "editorial": 15.0,
    "manual": 25.0,
}

HALF_LIFE_DAYS = {
    "mutual_contact_reveal": 45.0,
    "nfc_encounter": 30.0,
    "qr_encounter": 30.0,
    "same_table": 21.0,
    "same_hall": 14.0,
    "same_event": 14.0,
    "same_place": 14.0,
    "same_room": 10.0,
    "same_path": 10.0,
    "mood_board_overlap": 7.0,
    "echo": 7.0,
    "reply": 7.0,
    "signal": 7.0,
    "algorithmic_similarity": 3.0,
    "editorial": 7.0,
    "manual": 14.0,
}

REASON_LABELS = {
    "nfc_encounter": "You entered this Room from a Presence Pass.",
    "qr_encounter": "You entered this Room from a QR Room Key.",
    "same_room": "You shared Room context.",
    "same_hall": "You gathered in the same Hall.",
    "same_table": "You shared a Hall table.",
    "same_path": "You walked the same Path.",
    "same_event": "You shared an event context.",
    "same_place": "You shared a place context.",
    "mood_board_overlap": "Your Mood Boards overlap.",
    "echo": "You echoed this into your Garden.",
    "reply": "You replied in shared context.",
    "signal": "You signalled interest.",
    "editorial": "Curated for this Garden.",
    "algorithmic_similarity": "Similar tags, low-confidence.",
    "manual": "You kept this close.",
}


def create_or_update_seed(
    garden: PresenceGarden,
    *,
    seed_type: str,
    seed_id: int | None = None,
    source_type: str = "manual",
    source_ref_id: int | str | None = None,
    base_strength: float | None = None,
    half_life_days: float | None = None,
    quality_score: float | None = None,
    reason_label: str | None = None,
    metadata: dict[str, Any] | None = None,
    occurred_at=None,
) -> GardenSeed:
    seed_type = validate_choice(seed_type, SEED_TYPES, field="seed_type")
    source_type = validate_choice(source_type, SEED_SOURCE_TYPES, field="source_type", default="manual")
    seed = _find_seed(garden.id, seed_type, seed_id)
    now = occurred_at or now_utc()
    base = float(base_strength if base_strength is not None else BASE_STRENGTHS.get(source_type, 20.0))
    half_life = float(half_life_days if half_life_days is not None else HALF_LIFE_DAYS.get(source_type, 7.0))
    if not seed:
        seed = GardenSeed(
            garden_id=garden.id,
            seed_type=seed_type,
            seed_id=seed_id,
            source_type=source_type,
            source_ref_id=str(source_ref_id) if source_ref_id is not None else None,
            base_strength=base,
            current_weight=base,
            half_life_days=half_life,
            quality_score=quality_score if quality_score is not None else 1,
            last_shared_space_at=now,
            status="active",
            reason_label=clean_str(reason_label or explain_seed_reason(source_type), 240),
            metadata_json=json_object(metadata),
        )
        db.session.add(seed)
        db.session.flush()
    elif seed.status in {"blocked", "pruned"} and source_type not in {"manual", "echo"}:
        return seed
    else:
        seed.source_type = source_type
        seed.source_ref_id = str(source_ref_id) if source_ref_id is not None else seed.source_ref_id
        seed.base_strength = max(float(seed.base_strength or 0), base)
        seed.half_life_days = max(float(seed.half_life_days or 0), half_life)
        if quality_score is not None:
            seed.quality_score = max(float(seed.quality_score or 0), float(quality_score))
        seed.last_shared_space_at = now
        if seed.status in {"wilting", "composted"}:
            seed.status = "active"
        seed.reason_label = clean_str(reason_label or seed.reason_label or explain_seed_reason(source_type), 240)
        seed.metadata_json = {**(seed.metadata_json or {}), **json_object(metadata)}
    seed.current_weight = compute_seed_weight(seed, reference_time=now)
    return seed


def compute_seed_weight(seed: GardenSeed, *, reference_time=None) -> float:
    if seed.status in {"blocked", "pruned"}:
        return 0.0
    now = reference_time or now_utc()
    anchor = seed.last_shared_space_at or seed.created_at or now
    if seed.last_nurtured_at and seed.last_nurtured_at > anchor:
        anchor = seed.last_nurtured_at
    days = max((now - anchor).total_seconds() / 86400.0, 0.0)
    half_life = max(float(seed.half_life_days or 1), 0.1)
    base = float(seed.base_strength or 0)
    nurture = max(float(seed.nurture_multiplier or 1), 0)
    quality = max(float(seed.quality_score or 1), 0)
    return round(base * math.exp(-days / half_life) * nurture * quality, 3)


def recompute_garden_weights(garden: PresenceGarden, *, reference_time=None) -> list[GardenSeed]:
    rows = GardenSeed.query.filter_by(garden_id=garden.id).all()
    for seed in rows:
        seed.current_weight = compute_seed_weight(seed, reference_time=reference_time)
        if seed.status in {"active", "wilting", "composted"}:
            weight = float(seed.current_weight or 0)
            if weight < 3:
                seed.status = "composted"
            elif weight < 15:
                seed.status = "wilting"
            else:
                seed.status = "active"
    return rows


def nurture_seed(
    garden: PresenceGarden,
    seed: GardenSeed,
    observer,
    *,
    nurture_type: str = "manual_keep_close",
    strength_delta: float | None = None,
    metadata: dict[str, Any] | None = None,
) -> GardenNurture:
    if seed.garden_id != garden.id:
        raise PresenceValidationError("Seed does not belong to this Garden.")
    nurture_type = validate_choice(nurture_type, NURTURE_TYPES, field="nurture_type", default="manual_keep_close")
    now = now_utc()
    delta = float(strength_delta if strength_delta is not None else _default_nurture_delta(nurture_type))
    recent = (
        GardenNurture.query.filter_by(
            garden_id=garden.id,
            seed_id=seed.id,
            observer_id=observer.id,
            nurture_type=nurture_type,
        )
        .filter(GardenNurture.created_at >= now - timedelta(minutes=5))
        .first()
    )
    if recent:
        return recent
    nurture = GardenNurture(
        garden_id=garden.id,
        seed_id=seed.id,
        observer_id=observer.id,
        nurture_type=nurture_type,
        strength_delta=delta,
        metadata_json=json_object(metadata),
    )
    db.session.add(nurture)
    seed.last_nurtured_at = now
    seed.nurture_multiplier = min(float(seed.nurture_multiplier or 1) + (delta / 100.0), 5.0)
    if seed.status in {"wilting", "composted"}:
        seed.status = "active"
    seed.current_weight = compute_seed_weight(seed, reference_time=now)
    return nurture


def prune_seed(
    garden: PresenceGarden,
    seed: GardenSeed | None,
    *,
    target_type: str | None = None,
    target_id: int | None = None,
    prune_type: str = "prune",
    reason: str | None = None,
    reporter_observer=None,
) -> GardenPrune:
    prune_type = validate_choice(prune_type, PRUNE_TYPES, field="prune_type")
    if seed and seed.garden_id != garden.id:
        raise PresenceValidationError("Seed does not belong to this Garden.")
    effective_target_type = clean_str(target_type or getattr(seed, "seed_type", None), 40)
    effective_target_id = target_id if target_id is not None else getattr(seed, "seed_id", None)
    if not effective_target_type or effective_target_id is None:
        raise PresenceValidationError("target_type and target_id are required.")
    row = GardenPrune(
        garden_id=garden.id,
        seed_id=getattr(seed, "id", None),
        target_type=effective_target_type,
        target_id=int(effective_target_id),
        prune_type=prune_type,
        reason=clean_text(reason, 1000),
    )
    db.session.add(row)
    if seed:
        if prune_type == "block":
            seed.status = "blocked"
            seed.current_weight = 0
        elif prune_type in {"prune", "mute", "not_for_my_garden"}:
            seed.status = "pruned"
            seed.current_weight = 0
        elif prune_type == "see_less":
            seed.quality_score = max(float(seed.quality_score or 1) * 0.35, 0.05)
            seed.current_weight = compute_seed_weight(seed)
        elif prune_type == "report":
            seed.status = "pruned"
            seed.current_weight = 0
            db.session.add(
                ModerationFlag(
                    reporter_observer_id=getattr(reporter_observer, "id", None),
                    target_type=effective_target_type,
                    target_id=int(effective_target_id),
                    reason=clean_text(reason, 1000) or "Reported from Garden.",
                    status="open",
                )
            )
    return row


def compost_inactive_seeds(garden: PresenceGarden, *, reference_time=None) -> list[GardenSeed]:
    now = reference_time or now_utc()
    rows = GardenSeed.query.filter_by(garden_id=garden.id).filter(GardenSeed.status.in_(["active", "wilting"])).all()
    composted: list[GardenSeed] = []
    for seed in rows:
        weight = compute_seed_weight(seed, reference_time=now)
        seed.current_weight = weight
        anchor = seed.last_shared_space_at or seed.created_at or now
        if seed.last_nurtured_at and seed.last_nurtured_at > anchor:
            anchor = seed.last_nurtured_at
        inactive_days = (now - anchor).total_seconds() / 86400.0
        if weight < 3 or inactive_days > float(seed.half_life_days or 7) * 4:
            seed.status = "composted"
            composted.append(seed)
        elif weight < 15:
            seed.status = "wilting"
    return composted


def explain_seed_reason(source_type: str) -> str:
    return REASON_LABELS.get(source_type, "This appeared from shared Presence context.")


def seeds_from_shared_space(shared_space: SharedSpace, *, garden: PresenceGarden | None = None) -> list[GardenSeed]:
    from .presence_garden_service import get_or_create_default_garden

    if garden is None:
        if not shared_space.observer:
            return []
        garden = get_or_create_default_garden(shared_space.observer)
    seed_type, seed_id, source_type = _seed_from_space(shared_space)
    if not seed_type:
        return []
    seed = create_or_update_seed(
        garden,
        seed_type=seed_type,
        seed_id=seed_id,
        source_type=source_type,
        source_ref_id=shared_space.id,
        base_strength=float(shared_space.strength or BASE_STRENGTHS.get(source_type, 20.0)),
        reason_label=explain_seed_reason(source_type),
        metadata={"shared_space_id": shared_space.id, "space_type": shared_space.space_type},
        occurred_at=shared_space.occurred_at,
    )
    return [seed]


def serialize_seed(seed: GardenSeed) -> dict[str, Any]:
    current_weight = float(seed.current_weight or 0)
    reason = seed.reason_label or explain_seed_reason(seed.source_type)
    return {
        "id": seed.id,
        "garden_id": seed.garden_id,
        "observer_id": seed.garden.observer_id if seed.garden else None,
        "seed_type": seed.seed_type,
        "seed_kind": _frontend_seed_kind(seed.seed_type),
        "seed_id": seed.seed_id,
        "source_id": seed.seed_id,
        "source_label": _seed_source_label(seed),
        "source_slug": _seed_source_slug(seed),
        "source_image_url": _seed_source_image(seed),
        "source_type": seed.source_type,
        "source_ref_id": seed.source_ref_id,
        "base_strength": float(seed.base_strength or 0),
        "current_weight": current_weight,
        "strength": round(max(0.0, min(current_weight / 100.0, 1.0)), 3),
        "half_life_days": float(seed.half_life_days or 0),
        "nurture_multiplier": float(seed.nurture_multiplier or 0),
        "quality_score": float(seed.quality_score or 0),
        "last_shared_space_at": seed.last_shared_space_at.isoformat() if seed.last_shared_space_at else None,
        "last_shared_space": seed.last_shared_space_at.isoformat() if seed.last_shared_space_at else None,
        "last_nurtured_at": seed.last_nurtured_at.isoformat() if seed.last_nurtured_at else None,
        "status": seed.status,
        "state": "recently_watered" if seed.status == "active" and seed.last_nurtured_at else seed.status,
        "reason_label": reason,
        "reason": reason,
        "metadata": seed.metadata_json or {},
        "created_at": seed.created_at.isoformat() if seed.created_at else None,
        "updated_at": seed.updated_at.isoformat() if seed.updated_at else None,
        "primary_action": _primary_action(seed),
        "href": _seed_href(seed),
    }


def serialize_nurture(nurture: GardenNurture) -> dict[str, Any]:
    return {
        "id": nurture.id,
        "garden_id": nurture.garden_id,
        "seed_id": nurture.seed_id,
        "observer_id": nurture.observer_id,
        "nurture_type": nurture.nurture_type,
        "strength_delta": float(nurture.strength_delta or 0),
        "metadata": nurture.metadata_json or {},
        "created_at": nurture.created_at.isoformat() if nurture.created_at else None,
    }


def serialize_prune(prune: GardenPrune) -> dict[str, Any]:
    return {
        "id": prune.id,
        "garden_id": prune.garden_id,
        "seed_id": prune.seed_id,
        "target_type": prune.target_type,
        "target_id": prune.target_id,
        "prune_type": prune.prune_type,
        "reason": prune.reason,
        "created_at": prune.created_at.isoformat() if prune.created_at else None,
        "updated_at": prune.updated_at.isoformat() if prune.updated_at else None,
    }


def _find_seed(garden_id: int, seed_type: str, seed_id: int | None) -> GardenSeed | None:
    query = GardenSeed.query.filter_by(garden_id=garden_id, seed_type=seed_type)
    if seed_id is None:
        query = query.filter(GardenSeed.seed_id.is_(None))
    else:
        query = query.filter_by(seed_id=seed_id)
    return query.first()


def _default_nurture_delta(nurture_type: str) -> float:
    return {
        "follow": 15.0,
        "manual_keep_close": 12.0,
        "echo": 10.0,
        "reply": 8.0,
        "field_note": 8.0,
        "mood_board_add": 8.0,
        "room_return": 7.0,
        "hall_join": 6.0,
        "save": 6.0,
        "signal": 4.0,
        "path_walk": 4.0,
    }.get(nurture_type, 5.0)


def _seed_from_space(shared_space: SharedSpace) -> tuple[str | None, int | None, str]:
    if shared_space.space_type == "encounter" and shared_space.room_id:
        source = str((shared_space.metadata_json or {}).get("source") or "").lower()
        if source == "nfc":
            return "room", shared_space.room_id, "nfc_encounter"
        if source == "qr":
            return "room", shared_space.room_id, "qr_encounter"
        return "room", shared_space.room_id, "same_room"
    if shared_space.space_type == "room" and shared_space.room_id:
        return "room", shared_space.room_id, "same_room"
    if shared_space.space_type == "hall_table" and shared_space.hall_id:
        return "hall", shared_space.hall_id, "same_table"
    if shared_space.space_type == "hall" and shared_space.hall_id:
        return "hall", shared_space.hall_id, "same_hall"
    if shared_space.space_type == "path" and shared_space.path_id:
        return "path", shared_space.path_id, "same_path"
    if shared_space.space_type == "event" and shared_space.event_id:
        return "event", shared_space.event_id, "same_event"
    if shared_space.space_type == "place" and shared_space.space_id:
        return "place", shared_space.space_id, "same_place"
    if shared_space.space_type == "mood_board":
        return "mood_board", shared_space.space_id, "mood_board_overlap"
    return "shared_space", shared_space.id, "manual"


def _primary_action(seed: GardenSeed) -> str:
    if seed.status in {"blocked", "pruned"}:
        return "none"
    if seed.status == "wilting":
        return "nurture"
    if seed.status == "composted":
        return "open_compost"
    return "open"


def _frontend_seed_kind(seed_type: str) -> str:
    return "mask" if seed_type == "observer" else seed_type


def _seed_source_label(seed: GardenSeed) -> str:
    metadata = seed.metadata_json or {}
    for key in ("source_label", "label", "title"):
        if metadata.get(key):
            return str(metadata[key])
    if seed.seed_id is None:
        return seed.reason_label or "Shared Presence context"
    model_map = {
        "observer": ObserverProfile,
        "room": PresenceNode,
        "hall": PresenceHall,
        "path": Path,
        "mood_board": MoodBoard,
    }
    model = model_map.get(seed.seed_type)
    row = model.query.get(seed.seed_id) if model else None
    if not row:
        return seed.reason_label or seed.seed_type.replace("_", " ").title()
    return (
        getattr(row, "display_name", None)
        or getattr(row, "title", None)
        or getattr(row, "mask_name", None)
        or getattr(row, "alias", None)
        or seed.seed_type.replace("_", " ").title()
    )


def _seed_source_slug(seed: GardenSeed) -> str | None:
    if seed.seed_id is None:
        return None
    if seed.seed_type == "room":
        row = PresenceNode.query.get(seed.seed_id)
        return getattr(row, "slug", None)
    if seed.seed_type == "hall":
        row = PresenceHall.query.get(seed.seed_id)
        return getattr(row, "slug", None)
    if seed.seed_type == "observer":
        row = ObserverProfile.query.get(seed.seed_id)
        return getattr(row, "alias", None)
    return None


def _seed_source_image(seed: GardenSeed) -> str | None:
    metadata = seed.metadata_json or {}
    return metadata.get("source_image_url") or metadata.get("image_url") or metadata.get("cover_image_url")


def _seed_href(seed: GardenSeed) -> str | None:
    slug = _seed_source_slug(seed)
    if seed.seed_type == "room" and slug:
        return f"/r/{slug}"
    if seed.seed_type == "hall" and slug:
        return f"/halls/{slug}"
    if seed.seed_type == "observer" and slug:
        return f"/m/{slug}"
    if seed.seed_type == "path" and seed.seed_id:
        return f"/paths/{seed.seed_id}"
    if seed.seed_type == "mood_board" and seed.seed_id:
        return f"/mood-boards/{seed.seed_id}"
    return None
