from __future__ import annotations

import json
import math
import re
from copy import deepcopy
from datetime import datetime
from typing import Any, Callable
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
    draft_config_for_room,
    fingerprint_studio_v3_editable_config,
)
from .presence_media_storage import ALLOWED_IMAGE_MIME_TYPES


STUDIO_V3_PRIVATE_SCHEMA_VERSION = "presence-studio-v3-private-v1"
STUDIO_V3_METADATA_MAX_BYTES = 256 * 1024
STUDIO_V3_METADATA_SECTION_MAX_BYTES = 96 * 1024
STUDIO_V3_METADATA_MAX_DEPTH = 9
STUDIO_V3_METADATA_MAX_ITEMS = 160
STUDIO_V3_METADATA_MAX_OBJECT_KEYS = 160
STUDIO_V3_METADATA_CATEGORIES = {
    "owner_mode",
    "named_looks",
    "layer_locks",
    "layer_values",
    "object_edits",
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
STUDIO_V3_COMPOSITION_ZONE_RULES = {
    "opening-work": ({"feature", "large"}, {"framed", "quiet"}),
    "main-wall": ({"small", "medium", "large"}, {"framed", "captioned", "quiet"}),
    "supporting-notes": ({"small", "medium"}, {"quiet", "captioned"}),
    "cta-exit": ({"medium", "large"}, {"signal", "quiet"}),
    "influence-layer": ({"small"}, {"quiet"}),
    "threshold-image": ({"feature", "large"}, {"framed", "quiet"}),
    "threshold-statement": ({"medium", "large"}, {"quiet", "captioned"}),
    "threshold-signal": ({"small", "medium"}, {"signal", "quiet"}),
    "threshold-exit": ({"medium", "large"}, {"signal"}),
    "active-work-stage": ({"feature", "large"}, {"framed", "captioned"}),
    "sequence-index": ({"small", "medium"}, {"captioned", "quiet"}),
    "selected-work-context": ({"small", "medium"}, {"captioned", "quiet"}),
    "selected-works-exit": ({"medium", "large"}, {"signal", "quiet"}),
}
STUDIO_V3_COMPOSITION_ZONE_MAX_OBJECTS = {
    "opening-work": 1,
    "cta-exit": 1,
    "threshold-image": 1,
    "threshold-statement": 2,
    "threshold-exit": 1,
    "active-work-stage": 1,
    "selected-works-exit": 1,
}
STUDIO_V3_OBJECT_EDIT_ZONE_IDS = {
    zone_id
    for layout_zone_ids in STUDIO_V3_COMPOSITION_ZONE_IDS.values()
    for zone_id in layout_zone_ids
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
STUDIO_V3_MEDIA_STATUSES_BY_VISIBILITY = {
    "private_draft": {"draft_uploaded", "draft_attached", "ready"},
    "public_unlisted": {"draft_uploaded", "draft_attached", "ready"},
    "public_published": {"ready", "published"},
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
_BASE36_DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz"
_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")
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
_CREATOR_CODE_RE = re.compile(
    r"<\s*/?\s*[a-z][^>]*>|\b(?:eval|setTimeout|setInterval)\s*\(|"
    r"\b(?:document\.cookie|window\.location)|\bon[a-z]+\s*=",
    re.IGNORECASE,
)
_CREDENTIAL_ASSIGNMENT_RE = re.compile(
    r"\b(?:api[_ -]?key|client[_ -]?secret|password|private[_ -]?key|"
    r"access[_ -]?token|refresh[_ -]?token|auth[_ -]?token)\s*[:=]\s*\S+",
    re.IGNORECASE,
)
_BASE64_RE = re.compile(r"(?<![A-Za-z0-9+/_-])[A-Za-z0-9+/_-]{64,}={0,2}(?![A-Za-z0-9+/_-])")
_BLOB_MARKER_RE = re.compile(r"\b(?:base64|data64|blob)\s*[:=]", re.IGNORECASE)
_EMAIL_RE = re.compile(r"[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+")
_DOMAIN_LIKE_RE = re.compile(
    r"(?<![a-z0-9.-])(?:(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}|"
    r"(?:[0-9]{1,3}\.){3}[0-9]{1,3}|localhost)(?:[/:?#]|\.(?![a-z0-9-])|(?![a-z0-9.-]))|"
    r"\[[0-9a-f:]{2,}\](?:[/:?#]|\.(?![a-z0-9-])|(?![a-z0-9.-]))",
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


def _metadata_json_size(value: Any) -> int:
    try:
        encoded = json.dumps(
            value,
            allow_nan=False,
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        ).encode("utf-8")
    except (RecursionError, TypeError, ValueError, UnicodeEncodeError) as exc:
        raise StudioV3PrivateStateError("Studio V3 private metadata must be valid JSON.") from exc
    return len(encoded)


def _validate_metadata_bounds(value: Any) -> None:
    if _metadata_json_size(value) > STUDIO_V3_METADATA_MAX_BYTES:
        raise StudioV3PrivateStateError(
            f"Studio V3 private metadata exceeds {STUDIO_V3_METADATA_MAX_BYTES} bytes."
        )
    if isinstance(value, dict):
        for section_name, section_value in value.items():
            if _metadata_json_size(section_value) > STUDIO_V3_METADATA_SECTION_MAX_BYTES:
                raise StudioV3PrivateStateError(
                    f"metadata.{section_name} exceeds {STUDIO_V3_METADATA_SECTION_MAX_BYTES} bytes."
                )

    def walk(item: Any, *, path: str, depth: int) -> None:
        if depth > STUDIO_V3_METADATA_MAX_DEPTH:
            raise StudioV3PrivateStateError(f"{path} exceeds maximum nesting depth.")
        if isinstance(item, list):
            if len(item) > STUDIO_V3_METADATA_MAX_ITEMS:
                raise StudioV3PrivateStateError(f"{path} contains too many items.")
            for index, child in enumerate(item):
                walk(child, path=f"{path}[{index}]", depth=depth + 1)
            return
        if isinstance(item, dict):
            if len(item) > STUDIO_V3_METADATA_MAX_OBJECT_KEYS:
                raise StudioV3PrivateStateError(f"{path} contains too many fields.")
            for key, child in item.items():
                walk(child, path=f"{path}.{key}", depth=depth + 1)

    walk(value, path="metadata", depth=0)


def _reject_duplicate_identities(
    rows: list[dict[str, Any]],
    *,
    identity: Callable[[dict[str, Any]], Any],
    path: str,
    label: str,
) -> None:
    seen: set[Any] = set()
    for row in rows:
        row_identity = identity(row)
        if row_identity in seen:
            raise StudioV3PrivateStateError(f"{path} contains duplicate {label}.")
        seen.add(row_identity)


def _layer_value_identity(row: dict[str, Any]) -> tuple[str, str, str]:
    return row["scopeKind"], row["scopeId"], row["layer"]


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
            or _BASE64_RE.search(candidate)
            or _BLOB_MARKER_RE.search(candidate)
            or _EMAIL_RE.search(candidate)
            or _DOMAIN_LIKE_RE.search(candidate)
            or candidate.lower().startswith(("data:", "blob:", "file:", "mailto:", "javascript:"))
        ):
            raise StudioV3PrivateStateError(f"{path} contains forbidden private or executable content.")
    return text


def _creator_copy(value: Any, *, path: str, maximum: int) -> str:
    if not isinstance(value, str):
        raise StudioV3PrivateStateError(f"{path} must be text.")
    text = value.strip()
    if len(text) > maximum:
        raise StudioV3PrivateStateError(f"{path} is too long.")
    if not text:
        return ""
    cleaned = _safe_text(text, path=path, maximum=maximum)
    candidates = [cleaned]
    decoded = cleaned
    for _ in range(2):
        next_decoded = unquote(decoded)
        if next_decoded == decoded:
            break
        candidates.append(next_decoded)
        decoded = next_decoded
    if any(
        _CREATOR_CODE_RE.search(candidate) or _CREDENTIAL_ASSIGNMENT_RE.search(candidate)
        for candidate in candidates
    ):
        raise StudioV3PrivateStateError(f"{path} contains forbidden private or executable content.")
    return cleaned


def _stable_id(value: Any, *, path: str) -> str:
    text = _safe_text(value, path=path, maximum=160)
    if not _STABLE_ID_RE.fullmatch(text):
        raise StudioV3PrivateStateError(f"{path} must be a stable token.")
    return text


def _studio_v3_stable_digest(value: str) -> str:
    hash_value = 0x811C9DC5
    for character in value:
        hash_value ^= ord(character)
        hash_value = (hash_value * 0x01000193) & 0xFFFFFFFF
    encoded = ""
    while hash_value:
        hash_value, remainder = divmod(hash_value, 36)
        encoded = _BASE36_DIGITS[remainder] + encoded
    return (encoded or "0").rjust(7, "0")


def _studio_v3_object_edit_id(room_id: str, object_id: str) -> str:
    material = f"{room_id}\x1f{object_id}"
    return (
        f"object-edit:{_studio_v3_stable_digest(material)}:"
        f"{_studio_v3_stable_digest(material[::-1])}"
    )


def _studio_v3_object_id(room_id: str, source_ref: str) -> str:
    escaped_room = re.sub(r"[^A-Za-z0-9_-]+", "-", room_id).strip("-") or "room"
    material = f"{room_id}\x1f{source_ref}"
    return f"studio-v3:{escaped_room}:{_studio_v3_stable_digest(material)}"


def _is_studio_v3_placement_id(value: str, room_id: str, source_ref: str) -> bool:
    object_id = _studio_v3_object_id(room_id, source_ref)
    return value == object_id or bool(
        re.fullmatch(rf"{re.escape(object_id)}:attempt-[1-9][0-9]*", value)
    )


def _source_ref(value: Any, *, path: str) -> str:
    text = _safe_text(value, path=path, maximum=160)
    if not _SOURCE_REF_RE.fullmatch(text):
        raise StudioV3PrivateStateError(f"{path} must be a registered stable source reference.")
    numeric_match = _NUMERIC_SOURCE_REF_RE.fullmatch(text)
    if numeric_match and int(numeric_match.group(2)) > _MAX_DATABASE_INTEGER_ID:
        raise StudioV3PrivateStateError(f"{path} contains an out-of-range source ID.")
    return text


def _piece_source_ref(value: Any, *, path: str) -> str:
    text = _source_ref(value, path=path)
    if not text.startswith(("work:", "legacy-object:")):
        raise StudioV3PrivateStateError(f"{path} must reference a Piece.")
    return text


def _iso_timestamp(value: Any, *, path: str) -> str:
    text = _safe_text(value, path=path, maximum=64)
    if not re.match(r"^\d{4}-\d{2}-\d{2}T", text):
        raise StudioV3PrivateStateError(f"{path} must be an ISO timestamp.")
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
            cleaned[key] = _enum(
                item,
                allowed={"gallery-p2", "christina-liquid-gallery", "bbbvision-threshold-gallery"},
                path=item_path,
            )
        elif key == "objectRadius":
            cleaned[key] = _number(item, path=item_path, minimum=0, maximum=40)
        elif key == "shadowDepth":
            cleaned[key] = _number(item, path=item_path, minimum=0, maximum=1)
        elif key == "headingWeight":
            cleaned[key] = _number(item, path=item_path, minimum=300, maximum=900, integer=True)
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
    name = _creator_copy(item["name"], path=f"{path}.name", maximum=80)
    if not name:
        raise StudioV3PrivateStateError(f"{path}.name must not be empty.")
    cleaned: dict[str, Any] = {
        "id": look_id,
        "name": name,
        "values": _look_values(item["values"], path=f"{path}.values", require_complete=True),
        "provenance": _stable_id(item["provenance"], path=f"{path}.provenance"),
    }
    if "baseLookId" in item:
        cleaned["baseLookId"] = _enum(
            item["baseLookId"],
            allowed={"soft-editorial", "nocturnal-gallery", "zine-archive"},
            path=f"{path}.baseLookId",
        )
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
    placement_id = _stable_id(item["id"], path=f"{path}.id")
    room_id = _stable_id(item["roomId"], path=f"{path}.roomId")
    source_ref = _piece_source_ref(item["sourceRef"], path=f"{path}.sourceRef")
    if not _is_studio_v3_placement_id(placement_id, room_id, source_ref):
        raise StudioV3PrivateStateError(
            f"{path}.id must match the canonical opaque Room and source identity."
        )
    cleaned: dict[str, Any] = {
        "id": placement_id,
        "roomId": room_id,
        "sourceRef": source_ref,
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
    room_id = _stable_id(item["roomId"], path=f"{path}.roomId")
    style_id = _enum(item["styleId"], allowed=STUDIO_V3_ROOM_STYLE_IDS, path=f"{path}.styleId")
    composition_token = _enum(
        item["compositionToken"],
        allowed=STUDIO_V3_COMPOSITION_LAYOUT_IDS,
        path=f"{path}.compositionToken",
    )
    if composition_token != STUDIO_V3_ROOM_STYLE_LAYOUT_IDS[style_id]:
        raise StudioV3PrivateStateError(
            f"{path}.compositionToken must match {path}.styleId."
        )
    return {
        "roomId": room_id,
        "styleId": style_id,
        "compositionToken": composition_token,
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


def _object_edit(value: Any, *, path: str) -> dict[str, Any]:
    item = _require_exact_keys(
        value,
        allowed={
            "id",
            "roomId",
            "objectId",
            "sourceRef",
            "title",
            "body",
            "caption",
            "mediaSourceRef",
            "mediaId",
            "mediaAlt",
            "zoneId",
            "order",
            "size",
            "treatment",
            "featured",
            "visibility",
        },
        required={"id", "roomId", "objectId", "sourceRef"},
        path=path,
    )
    if "mediaSourceRef" in item and "mediaId" in item:
        raise StudioV3PrivateStateError(
            f"{path} must use either mediaSourceRef or mediaId, not both."
        )
    has_media_reference = "mediaSourceRef" in item or "mediaId" in item
    if "mediaAlt" in item and not has_media_reference:
        raise StudioV3PrivateStateError(f"{path}.mediaAlt requires a media reference.")

    edit_id = _stable_id(item["id"], path=f"{path}.id")
    room_id = _stable_id(item["roomId"], path=f"{path}.roomId")
    object_id = _stable_id(item["objectId"], path=f"{path}.objectId")
    if edit_id != _studio_v3_object_edit_id(room_id, object_id):
        raise StudioV3PrivateStateError(
            f"{path}.id must match the canonical opaque Room and object identity."
        )
    cleaned: dict[str, Any] = {
        "id": edit_id,
        "roomId": room_id,
        "objectId": object_id,
        "sourceRef": _piece_source_ref(item["sourceRef"], path=f"{path}.sourceRef"),
    }
    for key, maximum in (("title", 180), ("body", 4000), ("caption", 500)):
        if key in item:
            cleaned[key] = _creator_copy(item[key], path=f"{path}.{key}", maximum=maximum)
    if "mediaSourceRef" in item:
        cleaned["mediaSourceRef"] = _piece_source_ref(
            item["mediaSourceRef"],
            path=f"{path}.mediaSourceRef",
        )
    if "mediaId" in item:
        cleaned["mediaId"] = _stable_id(item["mediaId"], path=f"{path}.mediaId")
    if "mediaAlt" in item:
        cleaned["mediaAlt"] = _creator_copy(
            item["mediaAlt"],
            path=f"{path}.mediaAlt",
            maximum=240,
        )
    if "zoneId" in item:
        cleaned["zoneId"] = _enum(
            item["zoneId"],
            allowed=STUDIO_V3_OBJECT_EDIT_ZONE_IDS,
            path=f"{path}.zoneId",
        )
    if "order" in item:
        cleaned["order"] = _number(
            item["order"],
            path=f"{path}.order",
            minimum=0,
            maximum=10000,
            integer=True,
        )
    if "size" in item:
        cleaned["size"] = _enum(
            item["size"],
            allowed={"small", "medium", "large", "feature"},
            path=f"{path}.size",
        )
    if "treatment" in item:
        cleaned["treatment"] = _enum(
            item["treatment"],
            allowed={"quiet", "framed", "captioned", "signal"},
            path=f"{path}.treatment",
        )
    if "featured" in item:
        if not isinstance(item["featured"], bool):
            raise StudioV3PrivateStateError(f"{path}.featured must be boolean.")
        cleaned["featured"] = item["featured"]
    if "visibility" in item:
        cleaned["visibility"] = _enum(
            item["visibility"],
            allowed={"visible", "hidden"},
            path=f"{path}.visibility",
        )
    return cleaned


def _savepoint_composition_placement(value: Any, *, path: str) -> dict[str, Any]:
    item = _require_exact_keys(
        value,
        allowed={"objectId", "chamberId", "layoutId", "zoneId", "order", "size", "treatment"},
        required={"objectId", "chamberId", "layoutId", "zoneId", "order", "size"},
        path=path,
    )
    layout_id = _enum(item["layoutId"], allowed=STUDIO_V3_COMPOSITION_LAYOUT_IDS, path=f"{path}.layoutId")
    zone_id = _enum(item["zoneId"], allowed=STUDIO_V3_COMPOSITION_ZONE_IDS[layout_id], path=f"{path}.zoneId")
    allowed_sizes, allowed_treatments = STUDIO_V3_COMPOSITION_ZONE_RULES[zone_id]
    cleaned: dict[str, Any] = {
        "objectId": _stable_id(item["objectId"], path=f"{path}.objectId"),
        "chamberId": _stable_id(item["chamberId"], path=f"{path}.chamberId"),
        "layoutId": layout_id,
        "zoneId": zone_id,
        "order": _number(item["order"], path=f"{path}.order", minimum=0, maximum=10000, integer=True),
        "size": _enum(item["size"], allowed=allowed_sizes, path=f"{path}.size"),
    }
    if "treatment" in item:
        cleaned["treatment"] = _enum(
            item["treatment"],
            allowed=allowed_treatments,
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
    for zone_id, maximum in STUDIO_V3_COMPOSITION_ZONE_MAX_OBJECTS.items():
        if zone_id not in STUDIO_V3_COMPOSITION_ZONE_IDS[layout_id]:
            continue
        if sum(placement["zoneId"] == zone_id for placement in placements) > maximum:
            raise StudioV3PrivateStateError(
                f"{path}.placements exceeds the registered capacity for zone {zone_id}."
            )
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
        cleaned["sourceRef"] = _piece_source_ref(item["sourceRef"], path=f"{path}.sourceRef")
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
    _reject_duplicate_identities(
        layer_values,
        identity=_layer_value_identity,
        path=f"{path}.layerValues",
        label="layer values",
    )
    locks = [_layer_lock(row, path=f"{path}.locks[{index}]") for index, row in enumerate(item["locks"])]
    _reject_duplicate_identities(
        locks,
        identity=lambda row: row["id"],
        path=f"{path}.locks",
        label="lock IDs",
    )
    _reject_duplicate_identities(
        locks,
        identity=lambda row: (row["scopeKind"], row["scopeId"], row["layer"]),
        path=f"{path}.locks",
        label="lock scope and layer identities",
    )
    room_ids = {room["roomId"] for room in rooms}
    piece_scope_ids = _known_savepoint_piece_scope_ids(rooms)
    _validate_scoped_references(
        layer_values,
        path=f"{path}.layerValues",
        room_ids=room_ids,
        piece_scope_ids=piece_scope_ids,
    )
    _validate_scoped_references(
        locks,
        path=f"{path}.locks",
        room_ids=room_ids,
        piece_scope_ids=piece_scope_ids,
    )
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
        _reject_duplicate_identities(
            cleaned["roomStyles"],
            identity=lambda row: row["roomId"],
            path=f"{path}.roomStyles",
            label="Room IDs",
        )
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
        if len(set(cleaned["unresolvedRefs"])) != len(cleaned["unresolvedRefs"]):
            raise StudioV3PrivateStateError(f"{path}.unresolvedRefs contains duplicates.")
    return cleaned


def _compatibility(value: Any, *, path: str) -> dict[str, Any]:
    item = _require_exact_keys(
        value,
        allowed={"sourceRef", "roomId", "roomStyleId", "status", "reasonCode"},
        required={"sourceRef", "roomId", "roomStyleId", "status", "reasonCode"},
        path=path,
    )
    return {
        "sourceRef": _piece_source_ref(item["sourceRef"], path=f"{path}.sourceRef"),
        "roomId": _stable_id(item["roomId"], path=f"{path}.roomId"),
        "roomStyleId": _enum(item["roomStyleId"], allowed=STUDIO_V3_ROOM_STYLE_IDS, path=f"{path}.roomStyleId"),
        "status": _enum(item["status"], allowed={"compatible", "incompatible", "unresolved", "shelved"}, path=f"{path}.status"),
        "reasonCode": _stable_id(item["reasonCode"], path=f"{path}.reasonCode"),
    }


def _current_room_layouts(metadata: dict[str, Any]) -> dict[str, str]:
    restore = metadata.get("restore")
    if not isinstance(restore, dict):
        return {}
    room_styles = restore.get("roomStyles")
    if not isinstance(room_styles, list):
        return {}
    return {
        row["roomId"]: row["compositionToken"]
        for row in room_styles
    }


def _known_current_piece_scope_ids(metadata: dict[str, Any]) -> set[str]:
    scope_ids: set[str] = set()
    for placement in metadata.get("placements", []):
        scope_ids.update({placement["id"], placement["sourceRef"]})
        if "objectId" in placement:
            scope_ids.add(placement["objectId"])
    for compatibility in metadata.get("compatibility", []):
        source_ref = compatibility["sourceRef"]
        scope_ids.add(source_ref)
        if source_ref.startswith("legacy-object:"):
            scope_ids.add(source_ref[len("legacy-object:"):])
    for edit in metadata.get("object_edits", []):
        scope_ids.update({edit["objectId"], edit["sourceRef"]})
    return scope_ids


def _known_savepoint_piece_scope_ids(rooms: list[dict[str, Any]]) -> set[str]:
    scope_ids: set[str] = set()
    for room in rooms:
        for object_id in room.get("baseObjectIds", []):
            scope_ids.update({object_id, f"legacy-object:{object_id}"})
        for placement in room.get("placements", []):
            scope_ids.update({placement["id"], placement["sourceRef"]})
            if "objectId" in placement:
                scope_ids.add(placement["objectId"])
    return scope_ids


def _validate_scoped_references(
    entries: list[dict[str, Any]],
    *,
    path: str,
    room_ids: set[str],
    piece_scope_ids: set[str],
) -> None:
    for index, entry in enumerate(entries):
        scope_kind = entry["scopeKind"]
        scope_id = entry["scopeId"]
        scope_path = f"{path}[{index}].scopeId"
        if scope_kind == "presence":
            continue
        if scope_kind == "room":
            if scope_id not in room_ids:
                raise StudioV3PrivateStateError(
                    f"{scope_path} must reference a Room in the same current or saved structure."
                )
            continue
        numeric_match = _NUMERIC_SOURCE_REF_RE.fullmatch(scope_id)
        if numeric_match and int(numeric_match.group(2)) > _MAX_DATABASE_INTEGER_ID:
            raise StudioV3PrivateStateError(f"{scope_path} contains an out-of-range source ID.")
        if scope_kind == "collection":
            if not numeric_match or numeric_match.group(1) != "collection":
                raise StudioV3PrivateStateError(
                    f"{scope_path} must reference a canonical Collection."
                )
            continue
        if numeric_match and numeric_match.group(1) == "work":
            continue
        if scope_id not in piece_scope_ids:
            raise StudioV3PrivateStateError(
                f"{scope_path} must reference a Piece or placement in the same current or saved structure."
            )


def _validate_top_level_layer_references(metadata: dict[str, Any]) -> None:
    room_ids = set(_current_room_layouts(metadata))
    piece_scope_ids = _known_current_piece_scope_ids(metadata)
    for key in ("layer_locks", "layer_values"):
        _validate_scoped_references(
            metadata.get(key, []),
            path=f"metadata.{key}",
            room_ids=room_ids,
            piece_scope_ids=piece_scope_ids,
        )


def _validate_object_edit_composition_context(metadata: dict[str, Any]) -> None:
    room_layouts = _current_room_layouts(metadata)
    edited_zone_occupants: dict[tuple[str, str], set[str]] = {}
    for index, edit in enumerate(metadata.get("object_edits", [])):
        if not any(key in edit for key in ("zoneId", "size", "treatment", "featured")):
            continue
        path = f"metadata.object_edits[{index}]"
        layout_id = room_layouts.get(edit["roomId"])
        if layout_id is None:
            raise StudioV3PrivateStateError(
                f"{path}.roomId requires current Room layout context in metadata.restore.roomStyles."
            )
        if "zoneId" not in edit:
            raise StudioV3PrivateStateError(
                f"{path}.zoneId is required when size, treatment, or featured state changes."
            )
        zone_id = edit["zoneId"]
        if zone_id not in STUDIO_V3_COMPOSITION_ZONE_IDS[layout_id]:
            raise StudioV3PrivateStateError(
                f"{path}.zoneId is not registered for the target Room layout."
            )
        allowed_sizes, allowed_treatments = STUDIO_V3_COMPOSITION_ZONE_RULES[zone_id]
        if "size" in edit and edit["size"] not in allowed_sizes:
            raise StudioV3PrivateStateError(
                f"{path}.size is not registered for the target zone."
            )
        if "treatment" in edit and edit["treatment"] not in allowed_treatments:
            raise StudioV3PrivateStateError(
                f"{path}.treatment is not registered for the target zone."
            )
        if edit.get("featured") is True:
            if "feature" not in allowed_sizes or (
                "size" in edit and edit["size"] != "feature"
            ):
                raise StudioV3PrivateStateError(
                    f"{path}.featured is incompatible with the target zone or size."
                )
        if edit.get("featured") is False:
            non_feature_sizes = allowed_sizes - {"feature"}
            if not non_feature_sizes or edit.get("size") == "feature":
                raise StudioV3PrivateStateError(
                    f"{path}.featured is incompatible with the target zone or size."
                )
        if edit.get("visibility") != "hidden":
            edited_zone_occupants.setdefault((edit["roomId"], zone_id), set()).add(
                edit["objectId"]
            )

    for (room_id, zone_id), object_ids in edited_zone_occupants.items():
        maximum = STUDIO_V3_COMPOSITION_ZONE_MAX_OBJECTS.get(zone_id)
        if maximum is not None and len(object_ids) > maximum:
            raise StudioV3PrivateStateError(
                "metadata.object_edits contains more final edit targets than the registered "
                f"capacity for Room {room_id} zone {zone_id}."
            )


def normalise_studio_v3_private_metadata(value: Any) -> dict[str, Any]:
    metadata = _require_exact_keys(
        value,
        allowed=STUDIO_V3_METADATA_CATEGORIES,
        required=set(),
        path="metadata",
    )
    _validate_metadata_bounds(metadata)
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
        "layer_values": _layer_value,
        "object_edits": _object_edit,
        "savepoints": _savepoint,
        "placements": _placement,
        "compatibility": _compatibility,
    }
    for key, validator in list_validators.items():
        if key not in metadata:
            continue
        rows = metadata[key]
        if not isinstance(rows, list) or len(rows) > STUDIO_V3_METADATA_MAX_ITEMS:
            raise StudioV3PrivateStateError(f"metadata.{key} must be a bounded list.")
        cleaned[key] = [validator(row, path=f"metadata.{key}[{index}]") for index, row in enumerate(rows)]
    duplicate_specs = {
        "named_looks": (lambda row: row["id"], "Look IDs"),
        "layer_locks": (lambda row: row["id"], "lock IDs"),
        "layer_values": (_layer_value_identity, "layer values"),
        "object_edits": (lambda row: row["id"], "object edit IDs"),
        "savepoints": (lambda row: row["id"], "savepoint IDs"),
        "placements": (lambda row: row["id"], "placement IDs"),
        "compatibility": (
            lambda row: (row["sourceRef"], row["roomId"], row["roomStyleId"]),
            "compatibility identities",
        ),
    }
    for key, (identity, label) in duplicate_specs.items():
        if key in cleaned:
            _reject_duplicate_identities(
                cleaned[key],
                identity=identity,
                path=f"metadata.{key}",
                label=label,
            )
    if "layer_locks" in cleaned:
        _reject_duplicate_identities(
            cleaned["layer_locks"],
            identity=lambda row: (row["scopeKind"], row["scopeId"], row["layer"]),
            path="metadata.layer_locks",
            label="lock scope and layer identities",
        )
    if "object_edits" in cleaned:
        _reject_duplicate_identities(
            cleaned["object_edits"],
            identity=lambda row: (row["roomId"], row["objectId"], row["sourceRef"]),
            path="metadata.object_edits",
            label="Room, object, and source identities",
        )
    if "restore" in metadata:
        cleaned["restore"] = _restore(metadata["restore"], path="metadata.restore")
    _validate_top_level_layer_references(cleaned)
    _validate_object_edit_composition_context(cleaned)
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
            elif key == "mediaId" and isinstance(item, str):
                ids.add(item)
            else:
                ids.update(_metadata_media_ids(item))
    return ids


def _validate_presence_scope_ids(room: PresenceNode, metadata: dict[str, Any]) -> None:
    expected_scope_id = str(room.id)

    def walk(value: Any, *, path: str) -> None:
        if isinstance(value, list):
            for index, item in enumerate(value):
                walk(item, path=f"{path}[{index}]")
            return
        if not isinstance(value, dict):
            return
        if value.get("scopeKind") == "presence" and value.get("scopeId") != expected_scope_id:
            raise StudioV3PrivateStateError(
                f"{path}.scopeId must match the current Presence Room."
            )
        for key, item in value.items():
            walk(item, path=f"{path}.{key}")

    walk(metadata, path="metadata")


def _validate_metadata_media_ownership(room: PresenceNode, metadata: dict[str, Any]) -> None:
    media_ids = _metadata_media_ids(metadata)
    if not media_ids:
        return
    rows = (
        PresenceMediaAsset.query.filter(PresenceMediaAsset.id.in_(media_ids))
        .with_for_update()
        .all()
    )
    by_id = {row.id: row for row in rows}
    owner_user_id = _room_owner_id(room)
    for media_id in media_ids:
        row = by_id.get(media_id)
        if (
            row is None
            or row.room_id != room.id
            or row.owner_user_id != owner_user_id
            or row.mime_type not in ALLOWED_IMAGE_MIME_TYPES
            or row.status not in STUDIO_V3_MEDIA_STATUSES_BY_VISIBILITY.get(row.visibility, set())
        ):
            raise StudioV3PrivateStateError(
                "Studio V3 private metadata contains an unowned or unsupported image media ID."
            )


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
        scope_kind = value.get("scopeKind")
        scope_id = value.get("scopeId")
        if scope_kind in {"piece", "collection"} and isinstance(scope_id, str):
            numeric_match = _NUMERIC_SOURCE_REF_RE.fullmatch(scope_id)
            if numeric_match:
                source_id = int(numeric_match.group(2))
                if source_id > _MAX_DATABASE_INTEGER_ID:
                    raise StudioV3PrivateStateError(
                        "Studio V3 private metadata contains an out-of-range layer scope ID."
                    )
                if scope_kind == "piece" and numeric_match.group(1) == "work":
                    work_ids.add(source_id)
                elif scope_kind == "collection" and numeric_match.group(1) == "collection":
                    collection_ids.add(source_id)
        for key, item in value.items():
            if key in {"sourceRef", "collectionSourceRef", "mediaSourceRef"} and isinstance(item, str):
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
    if expected["source_kind"] == "published" and draft_config_for_room(room) is not None:
        raise StudioV3PrivateStateConflictError(
            "Studio V3 private-state published fallback is stale because a draft base is now active; reload before replacing metadata.",
            details={"mismatch": "selected_base.source_kind"},
        )
    query = PresenceEditableConfig.query.filter_by(
        id=expected["config_id"],
        room_id=room.id,
        status=expected["status"],
    )
    # The narrow synchronization exception is draft-only: serialize private
    # state replacement with atomic draft replacement/publish promotion, but do
    # not introduce a published-row lock or change published-base semantics.
    config = query.with_for_update().first() if expected["source_kind"] == "draft" else query.first()
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
    _validate_presence_scope_ids(room, metadata)
    _validate_metadata_source_ownership(room, metadata)
    base = _lock_expected_state_base(room, expected)

    owner_user_id = _room_owner_id(room)
    state = (
        PresenceStudioV3State.query.filter_by(owner_user_id=owner_user_id, room_id=room.id)
        .with_for_update()
        .first()
    )
    _validate_metadata_media_ownership(room, metadata)
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
