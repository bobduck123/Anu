from __future__ import annotations

import math
import re
from copy import deepcopy
from datetime import datetime
from typing import Any
from urllib.parse import unquote

from sqlalchemy import inspect as sqlalchemy_inspect

from ..extensions import db
from ..models import (
    PresenceCollection,
    PresenceEditableConfig,
    PresenceMediaAsset,
    PresenceNode,
    PresenceStudioV3State,
    PresenceWork,
)
from ..time_utils import now_utc
from .presence_editor_config import (
    EDITABLE_CONFIG_SCHEMA_VERSION,
    fingerprint_studio_v3_editable_config,
)


STUDIO_V3_PRIVATE_SCHEMA_VERSION = "presence-studio-v3-private-v1"
STUDIO_V3_METADATA_CATEGORIES = {
    "owner_mode",
    "named_looks",
    "layer_locks",
    "savepoints",
    "placements",
    "restore",
    "compatibility",
}
STUDIO_V3_STATE_EXPECTED_KEYS = {
    "room_id",
    "config_id",
    "source_kind",
    "status",
    "version",
    "revision",
    "schema_version",
    "fingerprint",
    "metadata_revision",
}
STUDIO_V3_ROOM_STYLE_IDS = {
    "threshold-portal",
    "gallery-wall",
    "film-strip-selected-works",
}
STUDIO_V3_LAYERS = {
    "presence-look",
    "room-style",
    "collection-presentation",
    "piece-treatment",
    "motion-atmosphere",
    "navigation-journey",
}
STUDIO_V3_SCOPE_KINDS = {"presence", "room", "collection", "piece"}
STUDIO_V3_WORLD_IDS = {
    "gallery",
    "zine",
    "dj",
    "healing",
    "market",
    "archive",
    "carpenter",
    "consultant",
}
STUDIO_V3_COLLECTION_PRESENTATION_IDS = {
    "wall",
    "selected-sequence",
    "threshold-feature",
}
STUDIO_V3_COMPOSITION_LAYOUT_IDS = {
    "gallery-wall",
    "portal-threshold",
    "film-strip-selected-works",
}
STUDIO_V3_ROOM_STYLE_LAYOUT_IDS = {
    "threshold-portal": "portal-threshold",
    "gallery-wall": "gallery-wall",
    "film-strip-selected-works": "film-strip-selected-works",
}
STUDIO_V3_COMPOSITION_ZONE_IDS = {
    "gallery-wall": {
        "opening-work",
        "main-wall",
        "supporting-notes",
        "cta-exit",
        "influence-layer",
    },
    "portal-threshold": {
        "threshold-image",
        "threshold-statement",
        "threshold-signal",
        "threshold-exit",
    },
    "film-strip-selected-works": {
        "active-work-stage",
        "sequence-index",
        "selected-work-context",
        "selected-works-exit",
    },
}
STUDIO_V3_JOURNEY_IDS = {
    "editorial-browse",
    "threshold-reveal",
    "archive-index",
}
STUDIO_V3_LOOK_VALUE_KEYS = {
    "background",
    "accentColor",
    "texture",
    "borderStyle",
    "objectRadius",
    "shadowDepth",
    "headingWeight",
    "motionIntensity",
    "publicStylePreset",
    "roomStyleId",
    "worldId",
    "collectionPresentationId",
    "density",
    "pieceTreatment",
    "atmosphere",
    "journey",
}

_FINGERPRINT_RE = re.compile(r"^[0-9a-f]{64}$")
_SAVEPOINT_FINGERPRINT_RE = re.compile(r"^(?:[0-9a-f]{16}(?::[0-9a-f]{16})?|[0-9a-f]{64})$")
_STABLE_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$")
_NAMED_LOOK_ID_RE = re.compile(r"^named:[a-z0-9][a-z0-9-]{0,119}$")
_SOURCE_REF_RE = re.compile(
    r"^(?:work:[1-9][0-9]*|collection:[1-9][0-9]*|collection:loaded-owner-library|legacy-object:[A-Za-z0-9][A-Za-z0-9_.:-]{0,127})$"
)
_NUMERIC_SOURCE_REF_RE = re.compile(r"^(work|collection):([1-9][0-9]*)$")
_MAX_DATABASE_INTEGER_ID = 2147483647
_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{3,8}$")
_URL_RE = re.compile(
    r"(?:[a-zA-Z][a-zA-Z0-9+.-]*://)|(?://)|(?:\bwww\.)|(?:\burl\s*\()|"
    r"(?:\b(?:data|blob|file|mailto|javascript)\s*:)",
    re.IGNORECASE,
)
_LOCAL_PATH_RE = re.compile(
    r"(?:(?<![a-zA-Z0-9])[a-zA-Z]:[\\/])|(?:\\\\)|"
    r"(?:(?:^|[\s:=,(])\.{1,2}[\\/])|(?:/(?:Users|home|var|etc|tmp|private)/)|"
    r"(?:[\\/][^\\/\s]+\.(?:png|jpe?g|webp|gif|svg|mp4|mp3|pdf|json|zip)(?:$|[\s,;)]))",
    re.IGNORECASE,
)
_SECRET_VALUE_RE = re.compile(
    r"(?:\bbearer\s+)|(?<![a-z0-9])(?:sk-[a-z0-9_-]{8,}|ghp_[a-z0-9]{8,}|xox[baprs]-[a-z0-9-]{8,})|"
    r"(?:eyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]+\.)|(?<![A-Z0-9])AKIA[A-Z0-9]{16}(?![A-Z0-9])|"
    r"(?:-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----)",
    re.IGNORECASE,
)
_EXECUTABLE_RE = re.compile(r"<\s*(?:script|style|iframe|object|embed)\b|javascript\s*:|expression\s*\(", re.IGNORECASE)
_GGM_MARKER_RE = re.compile(r"(?:\bggm\b|ggm-|christina|goddard|kerkvliet)", re.IGNORECASE)
_BASE64_RE = re.compile(r"(?<![A-Za-z0-9+/_-])[A-Za-z0-9+/_-]{64,}={0,2}(?![A-Za-z0-9+/_-])")
_BLOB_MARKER_RE = re.compile(r"\b(?:base64|data64|blob)\s*[:=]", re.IGNORECASE)
_EMAIL_RE = re.compile(r"[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+")
_DOMAIN_LIKE_RE = re.compile(
    r"(?<![a-z0-9.-])(?:(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}|"
    r"(?:[0-9]{1,3}\.){3}[0-9]{1,3}|localhost)(?:[/:?#]|$)|"
    r"\[[0-9a-f:]{2,}\](?:[/:?#]|$)",
    re.IGNORECASE,
)


class StudioV3PrivateStateError(ValueError):
    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.details = details or {}


class StudioV3PrivateStateConflictError(StudioV3PrivateStateError):
    pass


class StudioV3PrivateStateUnavailableError(StudioV3PrivateStateError):
    pass


def studio_v3_private_state_records_available() -> bool:
    try:
        return bool(sqlalchemy_inspect(db.engine).has_table(PresenceStudioV3State.__tablename__))
    except Exception:
        return False


def _require_private_state_table() -> None:
    if not studio_v3_private_state_records_available():
        raise StudioV3PrivateStateUnavailableError("Studio V3 private state is unavailable on this environment.")


def _room_owner_id(room: PresenceNode) -> int:
    owner_user_id = getattr(room, "owner_user_id", None)
    if isinstance(owner_user_id, bool) or not isinstance(owner_user_id, int) or owner_user_id <= 0:
        raise StudioV3PrivateStateError("Studio V3 private state requires an owner-bound Room.")
    return owner_user_id


def _require_exact_keys(value: Any, *, allowed: set[str], required: set[str], path: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise StudioV3PrivateStateError(f"{path} must be an object.")
    unknown = set(value) - allowed
    missing = required - set(value)
    if unknown or missing:
        raise StudioV3PrivateStateError(
            f"{path} does not match the registered metadata shape.",
            details={"unknown": sorted(unknown), "missing": sorted(missing)},
        )
    return value


def _safe_text(value: Any, *, path: str, maximum: int = 240) -> str:
    if not isinstance(value, str):
        raise StudioV3PrivateStateError(f"{path} must be text.")
    text = value.strip()
    if not text or len(text) > maximum:
        raise StudioV3PrivateStateError(f"{path} is empty or too long.")
    candidates = [text]
    decoded = text
    for _ in range(2):
        next_decoded = unquote(decoded)
        if next_decoded == decoded:
            break
        candidates.append(next_decoded)
        decoded = next_decoded
    for candidate in candidates:
        if (
            _URL_RE.search(candidate)
            or _LOCAL_PATH_RE.search(candidate)
            or _SECRET_VALUE_RE.search(candidate)
            or _EXECUTABLE_RE.search(candidate)
            or _GGM_MARKER_RE.search(candidate)
            or _BASE64_RE.search(candidate)
            or _BLOB_MARKER_RE.search(candidate)
            or _EMAIL_RE.search(candidate)
            or _DOMAIN_LIKE_RE.search(candidate)
            or candidate.lower().startswith(("data:", "blob:", "file:", "mailto:", "javascript:"))
        ):
            raise StudioV3PrivateStateError(f"{path} contains forbidden private or executable content.")
    return text


def _stable_id(value: Any, *, path: str) -> str:
    text = _safe_text(value, path=path, maximum=160)
    if not _STABLE_ID_RE.fullmatch(text):
        raise StudioV3PrivateStateError(f"{path} must be a stable token.")
    return text


def _source_ref(value: Any, *, path: str) -> str:
    text = _safe_text(value, path=path, maximum=160)
    if not _SOURCE_REF_RE.fullmatch(text):
        raise StudioV3PrivateStateError(f"{path} must be a registered stable source reference.")
    numeric_match = _NUMERIC_SOURCE_REF_RE.fullmatch(text)
    if numeric_match and int(numeric_match.group(2)) > _MAX_DATABASE_INTEGER_ID:
        raise StudioV3PrivateStateError(f"{path} contains an out-of-range source ID.")
    return text


def _iso_timestamp(value: Any, *, path: str) -> str:
    text = _safe_text(value, path=path, maximum=64)
    try:
        datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError as exc:
        raise StudioV3PrivateStateError(f"{path} must be an ISO timestamp.") from exc
    return text


def _number(value: Any, *, path: str, minimum: float, maximum: float, integer: bool = False) -> int | float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(float(value)):
        raise StudioV3PrivateStateError(f"{path} must be a finite number.")
    if integer and not isinstance(value, int):
        raise StudioV3PrivateStateError(f"{path} must be an integer.")
    if value < minimum or value > maximum:
        raise StudioV3PrivateStateError(f"{path} is outside the supported range.")
    return value


def _enum(value: Any, *, allowed: set[str], path: str) -> str:
    text = _safe_text(value, path=path, maximum=120)
    if text not in allowed:
        raise StudioV3PrivateStateError(f"{path} is unsupported.")
    return text


def _look_values(value: Any, *, path: str, require_complete: bool) -> dict[str, Any]:
    required = set(STUDIO_V3_LOOK_VALUE_KEYS) if require_complete else set()
    values = _require_exact_keys(value, allowed=STUDIO_V3_LOOK_VALUE_KEYS, required=required, path=path)
    if not values:
        raise StudioV3PrivateStateError(f"{path} must contain at least one registered Look token.")
    cleaned: dict[str, Any] = {}
    for key, item in values.items():
        item_path = f"{path}.{key}"
        if key in {"background", "accentColor"}:
            text = _safe_text(item, path=item_path, maximum=16)
            if not _COLOR_RE.fullmatch(text):
                raise StudioV3PrivateStateError(f"{item_path} must be a hex colour token.")
            cleaned[key] = text.lower()
        elif key == "texture":
            cleaned[key] = _enum(
                item,
                allowed={"none", "paper", "grain", "scan", "linen", "timber", "ledger"},
                path=item_path,
            )
        elif key == "borderStyle":
            cleaned[key] = _enum(
                item,
                allowed={"none", "hairline", "framed", "taped", "ledger"},
                path=item_path,
            )
        elif key == "motionIntensity":
            cleaned[key] = _enum(item, allowed={"still", "gentle", "living"}, path=item_path)
        elif key == "roomStyleId":
            cleaned[key] = _enum(item, allowed=STUDIO_V3_ROOM_STYLE_IDS, path=item_path)
        elif key == "worldId":
            cleaned[key] = _enum(item, allowed=STUDIO_V3_WORLD_IDS, path=item_path)
        elif key == "collectionPresentationId":
            cleaned[key] = _enum(item, allowed=STUDIO_V3_COLLECTION_PRESENTATION_IDS, path=item_path)
        elif key == "density":
            cleaned[key] = _enum(item, allowed={"spacious", "focused", "dense"}, path=item_path)
        elif key == "pieceTreatment":
            cleaned[key] = _enum(
                item,
                allowed={"quiet-framed", "luminous-depth", "captioned-ledger"},
                path=item_path,
            )
        elif key == "atmosphere":
            cleaned[key] = _enum(
                item,
                allowed={"paper-light", "nocturnal-depth", "ledger-scan"},
                path=item_path,
            )
        elif key == "journey":
            cleaned[key] = _enum(item, allowed=STUDIO_V3_JOURNEY_IDS, path=item_path)
        elif key == "publicStylePreset":
            cleaned[key] = _stable_id(item, path=item_path)
        elif key == "objectRadius":
            cleaned[key] = _number(item, path=item_path, minimum=0, maximum=100)
        elif key == "shadowDepth":
            cleaned[key] = _number(item, path=item_path, minimum=0, maximum=1)
        elif key == "headingWeight":
            cleaned[key] = _number(item, path=item_path, minimum=100, maximum=900, integer=True)
    return cleaned


def _named_look(value: Any, *, path: str) -> dict[str, Any]:
    allowed = {"id", "name", "baseLookId", "values", "provenance", "mediaIds", "createdAt", "updatedAt"}
    item = _require_exact_keys(
        value,
        allowed=allowed,
        required={"id", "name", "values", "provenance"},
        path=path,
    )
    look_id = _safe_text(item["id"], path=f"{path}.id", maximum=128)
    if not _NAMED_LOOK_ID_RE.fullmatch(look_id):
        raise StudioV3PrivateStateError(f"{path}.id must be an owner-named Look ID.")
    cleaned: dict[str, Any] = {
        "id": look_id,
        "name": _safe_text(item["name"], path=f"{path}.name", maximum=80),
        "values": _look_values(item["values"], path=f"{path}.values", require_complete=True),
        "provenance": _stable_id(item["provenance"], path=f"{path}.provenance"),
    }
    if "baseLookId" in item:
        cleaned["baseLookId"] = _stable_id(item["baseLookId"], path=f"{path}.baseLookId")
    if "mediaIds" in item:
        media_ids = item["mediaIds"]
        if not isinstance(media_ids, list) or len(media_ids) > 16:
            raise StudioV3PrivateStateError(f"{path}.mediaIds must be a short list.")
        cleaned["mediaIds"] = [_stable_id(media_id, path=f"{path}.mediaIds[{index}]") for index, media_id in enumerate(media_ids)]
        if len(set(cleaned["mediaIds"])) != len(cleaned["mediaIds"]):
            raise StudioV3PrivateStateError(f"{path}.mediaIds contains duplicates.")
    for key in ("createdAt", "updatedAt"):
        if key in item:
            cleaned[key] = _iso_timestamp(item[key], path=f"{path}.{key}")
    return cleaned


def _layer_lock(value: Any, *, path: str) -> dict[str, Any]:
    item = _require_exact_keys(
        value,
        allowed={"id", "scopeKind", "scopeId", "layer", "value", "reasonCode"},
        required={"id", "scopeKind", "scopeId", "layer", "value"},
        path=path,
    )
    cleaned = {
        "id": _stable_id(item["id"], path=f"{path}.id"),
        "scopeKind": _enum(item["scopeKind"], allowed=STUDIO_V3_SCOPE_KINDS, path=f"{path}.scopeKind"),
        "scopeId": _stable_id(item["scopeId"], path=f"{path}.scopeId"),
        "layer": _enum(item["layer"], allowed=STUDIO_V3_LAYERS, path=f"{path}.layer"),
        "value": _look_values(item["value"], path=f"{path}.value", require_complete=False),
    }
    if "reasonCode" in item:
        cleaned["reasonCode"] = _stable_id(item["reasonCode"], path=f"{path}.reasonCode")
    return cleaned


def _placement(value: Any, *, path: str) -> dict[str, Any]:
    item = _require_exact_keys(
        value,
        allowed={
            "id", "roomId", "sourceRef", "collectionSourceRef", "objectId", "order",
            "status", "featured", "depth", "visibility", "reasonCode",
        },
        required={"id", "roomId", "sourceRef", "order", "status"},
        path=path,
    )
    cleaned: dict[str, Any] = {
        "id": _stable_id(item["id"], path=f"{path}.id"),
        "roomId": _stable_id(item["roomId"], path=f"{path}.roomId"),
        "sourceRef": _source_ref(item["sourceRef"], path=f"{path}.sourceRef"),
        "order": _number(item["order"], path=f"{path}.order", minimum=0, maximum=10000, integer=True),
        "status": _enum(item["status"], allowed={"placed", "duplicate", "incompatible", "shelved"}, path=f"{path}.status"),
    }
    if "collectionSourceRef" in item:
        collection_ref = _source_ref(item["collectionSourceRef"], path=f"{path}.collectionSourceRef")
        if not collection_ref.startswith("collection:"):
            raise StudioV3PrivateStateError(f"{path}.collectionSourceRef must reference a Collection.")
        cleaned["collectionSourceRef"] = collection_ref
    if "objectId" in item:
        cleaned["objectId"] = _stable_id(item["objectId"], path=f"{path}.objectId")
    if "featured" in item:
        if not isinstance(item["featured"], bool):
            raise StudioV3PrivateStateError(f"{path}.featured must be boolean.")
        cleaned["featured"] = item["featured"]
    if "depth" in item:
        cleaned["depth"] = _number(item["depth"], path=f"{path}.depth", minimum=-100, maximum=100)
    if "visibility" in item:
        cleaned["visibility"] = _enum(item["visibility"], allowed={"visible", "hidden"}, path=f"{path}.visibility")
    if "reasonCode" in item:
        cleaned["reasonCode"] = _stable_id(item["reasonCode"], path=f"{path}.reasonCode")
    return cleaned


def _room_style(value: Any, *, path: str) -> dict[str, Any]:
    item = _require_exact_keys(
        value,
        allowed={"roomId", "styleId", "compositionToken"},
        required={"roomId", "styleId", "compositionToken"},
        path=path,
    )
    return {
        "roomId": _stable_id(item["roomId"], path=f"{path}.roomId"),
        "styleId": _enum(item["styleId"], allowed=STUDIO_V3_ROOM_STYLE_IDS, path=f"{path}.styleId"),
        "compositionToken": _stable_id(item["compositionToken"], path=f"{path}.compositionToken"),
    }


def _layer_value(value: Any, *, path: str) -> dict[str, Any]:
    item = _require_exact_keys(
        value,
        allowed={"scopeKind", "scopeId", "layer", "value"},
        required={"scopeKind", "scopeId", "layer", "value"},
        path=path,
    )
    return {
        "scopeKind": _enum(item["scopeKind"], allowed=STUDIO_V3_SCOPE_KINDS, path=f"{path}.scopeKind"),
        "scopeId": _stable_id(item["scopeId"], path=f"{path}.scopeId"),
        "layer": _enum(item["layer"], allowed=STUDIO_V3_LAYERS, path=f"{path}.layer"),
        "value": _look_values(item["value"], path=f"{path}.value", require_complete=False),
    }


def _savepoint_composition_placement(value: Any, *, path: str) -> dict[str, Any]:
    item = _require_exact_keys(
        value,
        allowed={"objectId", "chamberId", "layoutId", "zoneId", "order", "size", "treatment"},
        required={"objectId", "chamberId", "layoutId", "zoneId", "order", "size"},
        path=path,
    )
    layout_id = _enum(item["layoutId"], allowed=STUDIO_V3_COMPOSITION_LAYOUT_IDS, path=f"{path}.layoutId")
    cleaned: dict[str, Any] = {
        "objectId": _stable_id(item["objectId"], path=f"{path}.objectId"),
        "chamberId": _stable_id(item["chamberId"], path=f"{path}.chamberId"),
        "layoutId": layout_id,
        "zoneId": _enum(item["zoneId"], allowed=STUDIO_V3_COMPOSITION_ZONE_IDS[layout_id], path=f"{path}.zoneId"),
        "order": _number(item["order"], path=f"{path}.order", minimum=0, maximum=10000, integer=True),
        "size": _enum(item["size"], allowed={"small", "medium", "large", "feature"}, path=f"{path}.size"),
    }
    if "treatment" in item:
        cleaned["treatment"] = _enum(
            item["treatment"],
            allowed={"quiet", "framed", "captioned", "signal"},
            path=f"{path}.treatment",
        )
    return cleaned


def _savepoint_composition(value: Any, *, path: str, room_id: str) -> dict[str, Any]:
    item = _require_exact_keys(
        value,
        allowed={"layoutId", "placements"},
        required={"layoutId", "placements"},
        path=path,
    )
    layout_id = _enum(item["layoutId"], allowed=STUDIO_V3_COMPOSITION_LAYOUT_IDS, path=f"{path}.layoutId")
    raw_placements = item["placements"]
    if not isinstance(raw_placements, list) or len(raw_placements) > 160:
        raise StudioV3PrivateStateError(f"{path}.placements must be a bounded list.")
    placements = [
        _savepoint_composition_placement(row, path=f"{path}.placements[{index}]")
        for index, row in enumerate(raw_placements)
    ]
    object_ids = [row["objectId"] for row in placements]
    if len(set(object_ids)) != len(object_ids):
        raise StudioV3PrivateStateError(f"{path}.placements contains duplicate object references.")
    for index, placement in enumerate(placements):
        if placement["layoutId"] != layout_id:
            raise StudioV3PrivateStateError(f"{path}.placements[{index}].layoutId must match {path}.layoutId.")
        if placement["chamberId"] != room_id:
            raise StudioV3PrivateStateError(f"{path}.placements[{index}].chamberId must match its Room.")
    return {"layoutId": layout_id, "placements": placements}


def _savepoint_room(value: Any, *, path: str) -> dict[str, Any]:
    item = _require_exact_keys(
        value,
        allowed={
            "roomId",
            "order",
            "styleId",
            "collectionPresentationId",
            "composition",
            "baseObjectIds",
            "placements",
        },
        required={"roomId", "order", "styleId", "baseObjectIds", "placements"},
        path=path,
    )
    room_id = _stable_id(item["roomId"], path=f"{path}.roomId")
    style_id = _enum(item["styleId"], allowed=STUDIO_V3_ROOM_STYLE_IDS, path=f"{path}.styleId")
    raw_base_object_ids = item["baseObjectIds"]
    raw_placements = item["placements"]
    if not isinstance(raw_base_object_ids, list) or len(raw_base_object_ids) > 160:
        raise StudioV3PrivateStateError(f"{path}.baseObjectIds must be a bounded list.")
    if not isinstance(raw_placements, list) or len(raw_placements) > 160:
        raise StudioV3PrivateStateError(f"{path}.placements must be a bounded list.")
    base_object_ids = [
        _stable_id(object_id, path=f"{path}.baseObjectIds[{index}]")
        for index, object_id in enumerate(raw_base_object_ids)
    ]
    if len(set(base_object_ids)) != len(base_object_ids):
        raise StudioV3PrivateStateError(f"{path}.baseObjectIds contains duplicates.")
    placements = [_placement(row, path=f"{path}.placements[{index}]") for index, row in enumerate(raw_placements)]
    placement_ids = [row["id"] for row in placements]
    if len(set(placement_ids)) != len(placement_ids):
        raise StudioV3PrivateStateError(f"{path}.placements contains duplicate placement IDs.")
    for index, placement in enumerate(placements):
        if placement["roomId"] != room_id:
            raise StudioV3PrivateStateError(f"{path}.placements[{index}].roomId must match its Room.")
    known_object_ids = set(base_object_ids)
    known_object_ids.update(placement_ids)
    known_object_ids.update(row["objectId"] for row in placements if "objectId" in row)
    if set(base_object_ids).intersection(placement_ids):
        raise StudioV3PrivateStateError(f"{path} cannot reuse a base object ID as a placement ID.")
    cleaned: dict[str, Any] = {
        "roomId": room_id,
        "order": _number(item["order"], path=f"{path}.order", minimum=0, maximum=159, integer=True),
        "styleId": style_id,
        "baseObjectIds": base_object_ids,
        "placements": placements,
    }
    if "collectionPresentationId" in item:
        cleaned["collectionPresentationId"] = _enum(
            item["collectionPresentationId"],
            allowed=STUDIO_V3_COLLECTION_PRESENTATION_IDS,
            path=f"{path}.collectionPresentationId",
        )
    if "composition" in item:
        composition = _savepoint_composition(item["composition"], path=f"{path}.composition", room_id=room_id)
        expected_layout_id = STUDIO_V3_ROOM_STYLE_LAYOUT_IDS[style_id]
        if composition["layoutId"] != expected_layout_id:
            raise StudioV3PrivateStateError(f"{path}.composition.layoutId must match {path}.styleId.")
        unknown_object_ids = sorted(
            placement["objectId"]
            for placement in composition["placements"]
            if placement["objectId"] not in known_object_ids
        )
        if unknown_object_ids:
            raise StudioV3PrivateStateError(
                f"{path}.composition contains unresolved object references.",
                details={"unknown": unknown_object_ids},
            )
        cleaned["composition"] = composition
    return cleaned


def _savepoint_required_cta(value: Any, *, path: str) -> dict[str, Any]:
    item = _require_exact_keys(
        value,
        allowed={"visible", "sourceRef", "destinationToken"},
        required={"visible"},
        path=path,
    )
    if not isinstance(item["visible"], bool):
        raise StudioV3PrivateStateError(f"{path}.visible must be boolean.")
    cleaned: dict[str, Any] = {"visible": item["visible"]}
    if "sourceRef" in item:
        cleaned["sourceRef"] = _source_ref(item["sourceRef"], path=f"{path}.sourceRef")
    if "destinationToken" in item:
        destination = _safe_text(item["destinationToken"], path=f"{path}.destinationToken", maximum=160)
        if destination == "existing-base":
            cleaned["destinationToken"] = destination
        elif destination.startswith("room:") and len(destination) > len("room:"):
            room_id = _stable_id(destination[len("room:"):], path=f"{path}.destinationToken")
            cleaned["destinationToken"] = f"room:{room_id}"
        else:
            raise StudioV3PrivateStateError(f"{path}.destinationToken must be an existing-base or Room reference.")
    return cleaned


def _savepoint(value: Any, *, path: str) -> dict[str, Any]:
    allowed = {
        "id",
        "activeRoomId",
        "activeLookId",
        "roomOrder",
        "entryRoomId",
        "rooms",
        "layerValues",
        "locks",
        "requiredCta",
        "navigationToken",
        "baseRevision",
        "fingerprint",
        "createdAt",
    }
    required = set(allowed)
    item = _require_exact_keys(value, allowed=allowed, required=required, path=path)
    list_fields = ("roomOrder", "rooms", "layerValues", "locks")
    for key in list_fields:
        if not isinstance(item[key], list) or len(item[key]) > 160:
            raise StudioV3PrivateStateError(f"{path}.{key} must be a bounded list.")
    if not item["roomOrder"] or not item["rooms"]:
        raise StudioV3PrivateStateError(f"{path} must retain at least one Room reference.")
    room_order = [
        _stable_id(room_id, path=f"{path}.roomOrder[{index}]")
        for index, room_id in enumerate(item["roomOrder"])
    ]
    if len(set(room_order)) != len(room_order):
        raise StudioV3PrivateStateError(f"{path}.roomOrder contains duplicates.")
    rooms = [_savepoint_room(row, path=f"{path}.rooms[{index}]") for index, row in enumerate(item["rooms"])]
    room_ids = [room["roomId"] for room in rooms]
    room_orders = [room["order"] for room in rooms]
    if len(set(room_ids)) != len(room_ids):
        raise StudioV3PrivateStateError(f"{path}.rooms contains duplicate Room IDs.")
    if sorted(room_orders) != list(range(len(rooms))):
        raise StudioV3PrivateStateError(f"{path}.rooms must use a complete zero-based order.")
    ordered_room_ids = [room["roomId"] for room in sorted(rooms, key=lambda room: room["order"])]
    if ordered_room_ids != room_order:
        raise StudioV3PrivateStateError(f"{path}.roomOrder must match the ordered Room snapshots.")
    active_room_id = _stable_id(item["activeRoomId"], path=f"{path}.activeRoomId")
    entry_room_id = _stable_id(item["entryRoomId"], path=f"{path}.entryRoomId")
    if active_room_id not in room_ids or entry_room_id not in room_ids:
        raise StudioV3PrivateStateError(f"{path} contains an unresolved active or entry Room reference.")
    required_cta = _savepoint_required_cta(item["requiredCta"], path=f"{path}.requiredCta")
    destination_token = required_cta.get("destinationToken", "")
    if destination_token.startswith("room:") and destination_token[len("room:"):] not in room_ids:
        raise StudioV3PrivateStateError(f"{path}.requiredCta.destinationToken contains an unresolved Room reference.")
    layer_values = [
        _layer_value(row, path=f"{path}.layerValues[{index}]")
        for index, row in enumerate(item["layerValues"])
    ]
    locks = [_layer_lock(row, path=f"{path}.locks[{index}]") for index, row in enumerate(item["locks"])]
    lock_ids = [lock["id"] for lock in locks]
    if len(set(lock_ids)) != len(lock_ids):
        raise StudioV3PrivateStateError(f"{path}.locks contains duplicate lock IDs.")
    fingerprint = _safe_text(item["fingerprint"], path=f"{path}.fingerprint", maximum=160)
    if not _SAVEPOINT_FINGERPRINT_RE.fullmatch(fingerprint):
        raise StudioV3PrivateStateError(f"{path}.fingerprint must be a structural digest token.")
    return {
        "id": _stable_id(item["id"], path=f"{path}.id"),
        "activeRoomId": active_room_id,
        "activeLookId": _stable_id(item["activeLookId"], path=f"{path}.activeLookId"),
        "roomOrder": room_order,
        "entryRoomId": entry_room_id,
        "rooms": rooms,
        "layerValues": layer_values,
        "locks": locks,
        "requiredCta": required_cta,
        "navigationToken": _enum(item["navigationToken"], allowed={"room-order-v1"}, path=f"{path}.navigationToken"),
        "baseRevision": _number(item["baseRevision"], path=f"{path}.baseRevision", minimum=1, maximum=2147483647, integer=True),
        "fingerprint": fingerprint,
        "createdAt": _iso_timestamp(item["createdAt"], path=f"{path}.createdAt"),
    }


def _restore(value: Any, *, path: str) -> dict[str, Any]:
    item = _require_exact_keys(
        value,
        allowed={
            "activeSavepointId",
            "lastRestoredSavepointId",
            "activeRoomId",
            "activeLookId",
            "roomStyles",
            "comparison",
            "unresolvedRefs",
        },
        required=set(),
        path=path,
    )
    cleaned: dict[str, Any] = {}
    for key in ("activeSavepointId", "lastRestoredSavepointId", "activeRoomId", "activeLookId"):
        if key in item:
            cleaned[key] = _stable_id(item[key], path=f"{path}.{key}")
    if "roomStyles" in item:
        room_styles = item["roomStyles"]
        if not isinstance(room_styles, list) or len(room_styles) > 160:
            raise StudioV3PrivateStateError(f"{path}.roomStyles must be a bounded list.")
        cleaned["roomStyles"] = [
            _room_style(row, path=f"{path}.roomStyles[{index}]")
            for index, row in enumerate(room_styles)
        ]
    if "comparison" in item:
        comparison = _require_exact_keys(
            item["comparison"],
            allowed={"savepointId", "view"},
            required={"savepointId", "view"},
            path=f"{path}.comparison",
        )
        cleaned["comparison"] = {
            "savepointId": _stable_id(comparison["savepointId"], path=f"{path}.comparison.savepointId"),
            "view": _enum(comparison["view"], allowed={"before", "after"}, path=f"{path}.comparison.view"),
        }
    if "unresolvedRefs" in item:
        refs = item["unresolvedRefs"]
        if not isinstance(refs, list) or len(refs) > 160:
            raise StudioV3PrivateStateError(f"{path}.unresolvedRefs must be a bounded list.")
        cleaned["unresolvedRefs"] = [_stable_id(ref, path=f"{path}.unresolvedRefs[{index}]") for index, ref in enumerate(refs)]
    return cleaned


def _compatibility(value: Any, *, path: str) -> dict[str, Any]:
    item = _require_exact_keys(
        value,
        allowed={"sourceRef", "roomId", "roomStyleId", "status", "reasonCode"},
        required={"sourceRef", "roomId", "roomStyleId", "status", "reasonCode"},
        path=path,
    )
    return {
        "sourceRef": _source_ref(item["sourceRef"], path=f"{path}.sourceRef"),
        "roomId": _stable_id(item["roomId"], path=f"{path}.roomId"),
        "roomStyleId": _enum(item["roomStyleId"], allowed=STUDIO_V3_ROOM_STYLE_IDS, path=f"{path}.roomStyleId"),
        "status": _enum(item["status"], allowed={"compatible", "incompatible", "unresolved", "shelved"}, path=f"{path}.status"),
        "reasonCode": _stable_id(item["reasonCode"], path=f"{path}.reasonCode"),
    }


def normalise_studio_v3_private_metadata(value: Any) -> dict[str, Any]:
    metadata = _require_exact_keys(
        value,
        allowed=STUDIO_V3_METADATA_CATEGORIES,
        required=set(),
        path="metadata",
    )
    cleaned: dict[str, Any] = {}
    if "owner_mode" in metadata:
        cleaned["owner_mode"] = _enum(
            metadata["owner_mode"],
            allowed={"simple", "advanced-creative"},
            path="metadata.owner_mode",
        )
    list_validators = {
        "named_looks": _named_look,
        "layer_locks": _layer_lock,
        "savepoints": _savepoint,
        "placements": _placement,
        "compatibility": _compatibility,
    }
    for key, validator in list_validators.items():
        if key not in metadata:
            continue
        rows = metadata[key]
        if not isinstance(rows, list) or len(rows) > 160:
            raise StudioV3PrivateStateError(f"metadata.{key} must be a bounded list.")
        cleaned[key] = [validator(row, path=f"metadata.{key}[{index}]") for index, row in enumerate(rows)]
    if "restore" in metadata:
        cleaned["restore"] = _restore(metadata["restore"], path="metadata.restore")
    return cleaned


def _metadata_media_ids(metadata: Any) -> set[str]:
    ids: set[str] = set()
    if isinstance(metadata, list):
        for item in metadata:
            ids.update(_metadata_media_ids(item))
    elif isinstance(metadata, dict):
        for key, item in metadata.items():
            if key == "mediaIds" and isinstance(item, list):
                ids.update(str(media_id) for media_id in item)
            else:
                ids.update(_metadata_media_ids(item))
    return ids


def _validate_metadata_media_ownership(room: PresenceNode, metadata: dict[str, Any]) -> None:
    media_ids = _metadata_media_ids(metadata)
    if not media_ids:
        return
    rows = PresenceMediaAsset.query.filter(PresenceMediaAsset.id.in_(media_ids)).all()
    by_id = {row.id: row for row in rows}
    owner_user_id = _room_owner_id(room)
    for media_id in media_ids:
        row = by_id.get(media_id)
        if (
            row is None
            or row.room_id != room.id
            or row.owner_user_id != owner_user_id
            or row.status == "deleted"
        ):
            raise StudioV3PrivateStateError("Studio V3 private metadata contains an unowned media ID.")


def _metadata_numeric_source_ids(metadata: Any) -> tuple[set[int], set[int]]:
    work_ids: set[int] = set()
    collection_ids: set[int] = set()

    def collect(value: Any) -> None:
        if isinstance(value, list):
            for item in value:
                collect(item)
            return
        if not isinstance(value, dict):
            return
        for key, item in value.items():
            if key in {"sourceRef", "collectionSourceRef"} and isinstance(item, str):
                numeric_match = _NUMERIC_SOURCE_REF_RE.fullmatch(item)
                if numeric_match:
                    source_id = int(numeric_match.group(2))
                    if source_id > _MAX_DATABASE_INTEGER_ID:
                        raise StudioV3PrivateStateError(
                            "Studio V3 private metadata contains an out-of-range source ID."
                        )
                    if numeric_match.group(1) == "work":
                        work_ids.add(source_id)
                    else:
                        collection_ids.add(source_id)
            else:
                collect(item)

    collect(metadata)
    return work_ids, collection_ids


def _validate_metadata_source_ownership(room: PresenceNode, metadata: dict[str, Any]) -> None:
    work_ids, collection_ids = _metadata_numeric_source_ids(metadata)
    owned_work_ids: set[int] = set()
    if work_ids:
        owned_work_ids = {
            int(row.id)
            for row in PresenceWork.query.filter(
                PresenceWork.id.in_(work_ids),
                PresenceWork.node_id == room.id,
            ).all()
        }
    owned_collection_ids: set[int] = set()
    if collection_ids:
        owned_collection_ids = {
            int(row.id)
            for row in PresenceCollection.query.filter(
                PresenceCollection.id.in_(collection_ids),
                PresenceCollection.node_id == room.id,
            ).all()
        }
    missing_refs = [f"work:{source_id}" for source_id in sorted(work_ids - owned_work_ids)]
    missing_refs.extend(
        f"collection:{source_id}"
        for source_id in sorted(collection_ids - owned_collection_ids)
    )
    if missing_refs:
        raise StudioV3PrivateStateError(
            "Studio V3 private metadata contains a missing or foreign Room source reference.",
            details={"source_refs": missing_refs},
        )


def _normalise_state_expected(value: Any) -> dict[str, Any]:
    expected = _require_exact_keys(
        value,
        allowed=STUDIO_V3_STATE_EXPECTED_KEYS,
        required=STUDIO_V3_STATE_EXPECTED_KEYS,
        path="expected",
    )
    cleaned: dict[str, Any] = {}
    for key in ("room_id", "config_id", "version", "revision"):
        cleaned[key] = _number(expected[key], path=f"expected.{key}", minimum=1, maximum=2147483647, integer=True)
    cleaned["metadata_revision"] = _number(
        expected["metadata_revision"],
        path="expected.metadata_revision",
        minimum=0,
        maximum=2147483647,
        integer=True,
    )
    cleaned["source_kind"] = _enum(expected["source_kind"], allowed={"draft", "published"}, path="expected.source_kind")
    cleaned["status"] = _enum(expected["status"], allowed={"draft", "published"}, path="expected.status")
    if cleaned["source_kind"] != cleaned["status"]:
        raise StudioV3PrivateStateError("expected.source_kind must match expected.status.")
    schema_version = expected["schema_version"]
    if not isinstance(schema_version, str) or not schema_version.strip() or len(schema_version) > 120:
        raise StudioV3PrivateStateError("expected.schema_version must be a non-empty schema token.")
    cleaned["schema_version"] = schema_version.strip()
    fingerprint = str(expected["fingerprint"] or "").strip().lower()
    if not _FINGERPRINT_RE.fullmatch(fingerprint):
        raise StudioV3PrivateStateError("expected.fingerprint must be a lowercase SHA-256 digest.")
    cleaned["fingerprint"] = fingerprint
    return cleaned


def _lock_expected_state_base(room: PresenceNode, expected: dict[str, Any]) -> PresenceEditableConfig:
    if expected["room_id"] != room.id:
        raise StudioV3PrivateStateConflictError("Studio V3 private-state base Room changed.")
    config = (
        PresenceEditableConfig.query.filter_by(
            id=expected["config_id"],
            room_id=room.id,
            status=expected["status"],
        )
        .with_for_update()
        .first()
    )
    if config is None:
        raise StudioV3PrivateStateConflictError("Studio V3 private-state base is missing or changed.")
    actual = {
        "version": int(config.version),
        "revision": int(config.revision or 1),
        "schema_version": EDITABLE_CONFIG_SCHEMA_VERSION,
        "fingerprint": fingerprint_studio_v3_editable_config(config),
    }
    for key, value in actual.items():
        if expected[key] != value:
            raise StudioV3PrivateStateConflictError(
                "Studio V3 private-state base changed; reload before replacing metadata.",
                details={"mismatch": key},
            )
    return config


def load_studio_v3_private_state(room: PresenceNode) -> PresenceStudioV3State | None:
    _require_private_state_table()
    owner_user_id = _room_owner_id(room)
    return PresenceStudioV3State.query.filter_by(owner_user_id=owner_user_id, room_id=room.id).first()


def replace_studio_v3_private_state(
    room: PresenceNode,
    actor,
    data: Any,
) -> PresenceStudioV3State:
    _require_private_state_table()
    request_data = _require_exact_keys(
        data,
        allowed={"expected", "metadata_schema_version", "metadata"},
        required={"expected", "metadata_schema_version", "metadata"},
        path="request",
    )
    if request_data["metadata_schema_version"] != STUDIO_V3_PRIVATE_SCHEMA_VERSION:
        raise StudioV3PrivateStateError("metadata_schema_version is unsupported.")
    expected = _normalise_state_expected(request_data["expected"])
    metadata = normalise_studio_v3_private_metadata(request_data["metadata"])
    _validate_metadata_source_ownership(room, metadata)
    base = _lock_expected_state_base(room, expected)
    _validate_metadata_media_ownership(room, metadata)

    owner_user_id = _room_owner_id(room)
    state = (
        PresenceStudioV3State.query.filter_by(owner_user_id=owner_user_id, room_id=room.id)
        .with_for_update()
        .first()
    )
    if state is None:
        if expected["metadata_revision"] != 0:
            raise StudioV3PrivateStateConflictError("Studio V3 private state does not exist at the expected revision.")
        state = PresenceStudioV3State(
            owner_user_id=owner_user_id,
            room_id=room.id,
            metadata_revision=1,
            created_by_user_id=getattr(actor, "id", None),
            created_at=now_utc(),
        )
        db.session.add(state)
    else:
        if int(state.metadata_revision or 1) != expected["metadata_revision"]:
            raise StudioV3PrivateStateConflictError(
                "Studio V3 private state changed; reload before replacing metadata.",
                details={"mismatch": "metadata_revision"},
            )
        stored_base = {
            "config_id": int(state.base_config_id),
            "source_kind": state.base_source_kind,
            "status": state.base_status,
            "version": int(state.base_version),
            "revision": int(state.base_revision),
            "schema_version": state.base_schema_version,
            "fingerprint": state.base_fingerprint,
        }
        for key, stored_value in stored_base.items():
            if expected[key] != stored_value:
                raise StudioV3PrivateStateConflictError(
                    "Studio V3 private state belongs to a different base; an explicit reviewed rebase is required.",
                    details={"mismatch": f"stored_base.{key}"},
                )
        state.metadata_revision = int(state.metadata_revision or 1) + 1

    state.base_config_id = base.id
    state.base_source_kind = expected["source_kind"]
    state.base_status = base.status
    state.base_version = int(base.version)
    state.base_revision = int(base.revision or 1)
    state.base_schema_version = EDITABLE_CONFIG_SCHEMA_VERSION
    state.base_fingerprint = fingerprint_studio_v3_editable_config(base)
    state.metadata_schema_version = STUDIO_V3_PRIVATE_SCHEMA_VERSION
    state.metadata_json = metadata
    state.updated_by_user_id = getattr(actor, "id", None)
    state.updated_at = now_utc()
    db.session.flush()
    return state


def serialize_studio_v3_private_state(state: PresenceStudioV3State | None) -> dict[str, Any] | None:
    if state is None:
        return None
    return {
        "id": state.id,
        "room_id": state.room_id,
        "metadata_schema_version": state.metadata_schema_version,
        "metadata_revision": int(state.metadata_revision),
        "base": {
            "config_id": state.base_config_id,
            "source_kind": state.base_source_kind,
            "status": state.base_status,
            "version": int(state.base_version),
            "revision": int(state.base_revision),
            "schema_version": state.base_schema_version,
            "fingerprint": state.base_fingerprint,
        },
        "metadata": deepcopy(state.metadata_json or {}),
        "created_at": state.created_at.isoformat() if state.created_at else None,
        "updated_at": state.updated_at.isoformat() if state.updated_at else None,
    }
