from __future__ import annotations

from typing import Any

from ..extensions import db
from ..models import GardenSeed, Observation, ObserverProfile, PresenceGarden, SharedSpace
from .presence_seed_service import recompute_garden_weights, serialize_seed
from .presence_service import PresenceValidationError, normalize_slug
from .presence_social_service import clean_str, clean_text, json_object, serialize_observer_profile, validate_choice
from .presence_upgrade_guard_service import validate_observer_no_self_promotion


GARDEN_VISIBILITIES = {"private", "public", "unlisted"}
GARDEN_STATUSES = {"active", "archived", "suspended"}


def get_or_create_default_garden(observer: ObserverProfile, data: dict[str, Any] | None = None) -> PresenceGarden:
    existing = PresenceGarden.query.filter_by(observer_id=observer.id).first()
    if existing:
        return existing
    payload = data or {}
    title = clean_str(payload.get("title"), 180) or f"{observer.mask_name or observer.alias}'s Garden"
    slug = _unique_garden_slug(payload.get("slug") or observer.alias)
    description = clean_text(payload.get("description"), 1000)
    validate_observer_no_self_promotion(title, description, field="Garden")
    garden = PresenceGarden(
        observer_id=observer.id,
        title=title,
        slug=slug,
        description=description,
        visibility=validate_choice(payload.get("visibility"), GARDEN_VISIBILITIES, field="visibility", default="private"),
        theme_key=clean_str(payload.get("theme_key"), 80),
        status="active",
        metadata_json=json_object(payload.get("metadata") or payload.get("metadata_json")),
    )
    db.session.add(garden)
    db.session.flush()
    return garden


def get_public_garden(alias_or_slug: str) -> PresenceGarden | None:
    key = clean_str(alias_or_slug, 180)
    if not key:
        return None
    garden = PresenceGarden.query.filter_by(slug=key, status="active").filter(PresenceGarden.visibility.in_(["public", "unlisted"])).first()
    if garden:
        return garden
    observer = ObserverProfile.query.filter_by(alias=key, status="active").first()
    if not observer:
        return None
    return (
        PresenceGarden.query.filter_by(observer_id=observer.id, status="active")
        .filter(PresenceGarden.visibility.in_(["public", "unlisted"]))
        .first()
    )


def update_garden(garden: PresenceGarden, data: dict[str, Any]) -> PresenceGarden:
    title = clean_str(data.get("title"), 180) if "title" in data else garden.title
    description = clean_text(data.get("description"), 1000) if "description" in data else garden.description
    validate_observer_no_self_promotion(title, description, data.get("metadata") or data.get("metadata_json"), field="Garden")
    if "title" in data:
        garden.title = title or garden.title
    if "slug" in data:
        garden.slug = _unique_garden_slug(data.get("slug"), current_garden_id=garden.id) if data.get("slug") else None
    if "description" in data:
        garden.description = description
    if "visibility" in data:
        garden.visibility = validate_choice(data.get("visibility"), GARDEN_VISIBILITIES, field="visibility")
    if "theme_key" in data:
        garden.theme_key = clean_str(data.get("theme_key"), 80)
    if "pinned_observation_id" in data:
        garden.pinned_observation_id = _int_or_none(data.get("pinned_observation_id"))
    if "pinned_mood_board_id" in data:
        garden.pinned_mood_board_id = _int_or_none(data.get("pinned_mood_board_id"))
    if "status" in data:
        garden.status = validate_choice(data.get("status"), GARDEN_STATUSES, field="status")
    if "metadata" in data or "metadata_json" in data:
        garden.metadata_json = json_object(data.get("metadata") or data.get("metadata_json"))
    return garden


def enforce_garden_visibility(garden: PresenceGarden, *, observer: ObserverProfile | None = None) -> None:
    if garden.status != "active":
        raise PresenceValidationError("Garden is not active.")
    if garden.visibility in {"public", "unlisted"}:
        return
    if observer and observer.id == garden.observer_id:
        return
    raise PresenceValidationError("Garden is private.")


def list_garden_activity(garden: PresenceGarden, *, include_private: bool = False, limit: int = 50) -> list[dict[str, Any]]:
    from .presence_observation_service import serialize_observation

    query = Observation.query.filter_by(garden_id=garden.id).filter(Observation.status == "active")
    if not include_private:
        query = query.filter(Observation.visibility.in_(["public", "garden", "unlisted"]))
    rows = query.order_by(Observation.created_at.desc(), Observation.id.desc()).limit(max(1, min(limit, 100))).all()
    return [serialize_observation(row) for row in rows]


def get_garden_home(garden: PresenceGarden) -> dict[str, Any]:
    from .presence_observation_service import serialize_observation

    seeds = recompute_garden_weights(garden)
    visible_seeds = [seed for seed in seeds if seed.status not in {"blocked", "pruned"}]
    active_seed_ids_by_type = _seed_ids_by_type(visible_seeds)
    high_weight = sorted(
        [seed for seed in visible_seeds if seed.status == "active"],
        key=lambda seed: (float(seed.current_weight or 0), seed.updated_at or seed.created_at),
        reverse=True,
    )
    observations = _observations_for_seed_targets(garden, active_seed_ids_by_type)

    def seed_item(seed: GardenSeed, action: str | None = None) -> dict[str, Any]:
        payload = serialize_seed(seed)
        payload["primary_action"] = action or payload.get("primary_action") or "open"
        return payload

    sections = {
        "new_growth": [
            {
                "type": "observation",
                "observation": serialize_observation(row),
                "source_seed": serialize_seed(_matching_seed(row, high_weight)) if _matching_seed(row, high_weight) else None,
                "reason_label": getattr(_matching_seed(row, high_weight), "reason_label", None) or "Fresh Observation from a high-weight Seed.",
                "current_weight": float(getattr(_matching_seed(row, high_weight), "current_weight", 0) or 0),
                "primary_action": "open",
            }
            for row in observations[:12]
        ],
        "recently_watered": [seed_item(seed, "open") for seed in sorted(visible_seeds, key=lambda seed: seed.last_nurtured_at or seed.created_at, reverse=True) if seed.last_nurtured_at][:12],
        "crossed_paths": [
            {
                "type": "shared_space",
                "id": row.id,
                "space_type": row.space_type,
                "space_id": row.space_id,
                "room_id": row.room_id,
                "hall_id": row.hall_id,
                "path_id": row.path_id,
                "reason_label": "Recent shared Presence context.",
                "primary_action": "open",
                "occurred_at": row.occurred_at.isoformat() if row.occurred_at else None,
            }
            for row in _recent_shared_spaces(garden.observer_id)
        ],
        "from_rooms_you_entered": [seed_item(seed, "open") for seed in high_weight if seed.seed_type == "room"][:12],
        "from_your_mood_boards": [seed_item(seed, "open") for seed in high_weight if seed.seed_type == "mood_board" or seed.source_type == "mood_board_overlap"][:12],
        "quiet_shoots": [
            seed_item(seed, "nurture")
            for seed in sorted(
                [seed for seed in visible_seeds if seed.status == "active" and 3 <= float(seed.current_weight or 0) < 25],
                key=lambda seed: float(seed.current_weight or 0),
            )
        ][:12],
        "wilting_seeds": [seed_item(seed, "nurture") for seed in visible_seeds if seed.status == "wilting"][:12],
        "compost": [seed_item(seed, "open_compost") for seed in visible_seeds if seed.status == "composted"][:12],
    }
    return {
        "garden": serialize_garden(garden, private=True),
        "sections": sections,
        "copy": "Garden surfaces are deterministic and explainable: shared spaces, echoes, nurtures, and decaying Seeds.",
    }


def serialize_garden(garden: PresenceGarden, *, private: bool = False) -> dict[str, Any]:
    payload = {
        "id": garden.id,
        "observer_id": garden.observer_id if private else None,
        "title": garden.title,
        "slug": garden.slug,
        "description": garden.description,
        "visibility": garden.visibility,
        "theme_key": garden.theme_key,
        "pinned_observation_id": garden.pinned_observation_id,
        "pinned_mood_board_id": garden.pinned_mood_board_id,
        "status": garden.status,
        "metadata": garden.metadata_json or {},
        "observer_mask": serialize_observer_profile(garden.observer, private=False) if garden.observer else None,
        "created_at": garden.created_at.isoformat() if garden.created_at else None,
        "updated_at": garden.updated_at.isoformat() if garden.updated_at else None,
        "copy": "Gardens are personal, masked, social, and non-commercial.",
    }
    return payload


def _unique_garden_slug(value: Any, *, current_garden_id: int | None = None) -> str:
    base = normalize_slug(value, fallback="garden")[:160]
    candidate = base
    suffix = 2
    while True:
        query = PresenceGarden.query.filter_by(slug=candidate)
        if current_garden_id:
            query = query.filter(PresenceGarden.id != current_garden_id)
        if not query.first():
            return candidate
        suffix_text = f"-{suffix}"
        candidate = f"{base[: 180 - len(suffix_text)]}{suffix_text}"
        suffix += 1


def _observations_for_seed_targets(garden: PresenceGarden, seed_ids_by_type: dict[str, set[int]]) -> list[Observation]:
    query = Observation.query.filter(
        Observation.status == "active",
        Observation.visibility.in_(["public", "garden", "unlisted"]),
    ).filter(
        db.or_(
            Observation.garden_id == garden.id,
            Observation.room_id.in_(seed_ids_by_type.get("room", {-1})),
            Observation.hall_id.in_(seed_ids_by_type.get("hall", {-1})),
            Observation.path_id.in_(seed_ids_by_type.get("path", {-1})),
            Observation.mood_board_id.in_(seed_ids_by_type.get("mood_board", {-1})),
        )
    )
    return query.order_by(Observation.created_at.desc(), Observation.id.desc()).limit(50).all()


def _seed_ids_by_type(seeds: list[GardenSeed]) -> dict[str, set[int]]:
    result: dict[str, set[int]] = {}
    for seed in seeds:
        if seed.seed_id is not None:
            result.setdefault(seed.seed_type, set()).add(seed.seed_id)
    return result


def _matching_seed(observation: Observation, seeds: list[GardenSeed]) -> GardenSeed | None:
    targets = [
        ("room", observation.room_id),
        ("hall", observation.hall_id),
        ("path", observation.path_id),
        ("mood_board", observation.mood_board_id),
        ("observer", observation.author_observer_id),
    ]
    for seed_type, seed_id in targets:
        if seed_id is None:
            continue
        for seed in seeds:
            if seed.seed_type == seed_type and seed.seed_id == seed_id:
                return seed
    return None


def _recent_shared_spaces(observer_id: int, *, limit: int = 12) -> list[SharedSpace]:
    return (
        SharedSpace.query.filter_by(observer_id=observer_id)
        .order_by(SharedSpace.occurred_at.desc(), SharedSpace.id.desc())
        .limit(limit)
        .all()
    )


def _int_or_none(value: Any) -> int | None:
    try:
        return int(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None
