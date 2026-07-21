from __future__ import annotations

import hashlib
import hmac
import json
import math
import re
import time
from copy import deepcopy
from decimal import Decimal
from typing import Any
from urllib.parse import urlparse

from flask import current_app
from sqlalchemy import inspect as sqlalchemy_inspect

from ..extensions import db
from ..models import PresenceCollection, PresenceEditableConfig, PresenceMediaAsset, PresenceNode, PresenceWork
from .presence_media_storage import (
    PresenceMediaStorageError,
    delete_private_media_object,
    draft_media_read_url,
    private_draft_storage_configured,
    private_draft_storage_enabled,
    private_draft_storage_verified,
    promote_presence_media,
)
from ..time_utils import now_utc


EDITABLE_CONFIG_SCHEMA_VERSION = "presence-editable-config-v1"
EDITABLE_CONFIG_STATUSES = {"draft", "published", "archived"}
EDITABLE_CONFIG_JSON_FIELDS = {
    "scene_config": "scene_config_json",
    "style_dna": "style_dna_json",
    "motion_config": "motion_config_json",
    "asset_config": "asset_config_json",
    "content_config": "content_config_json",
    "roomkey_config": "roomkey_config_json",
    "enquiry_config": "enquiry_config_json",
    "locked_fields": "locked_fields_json",
}
EDITOR_CONFIG_MAX_BYTES = 256 * 1024
EDITOR_SECTION_MAX_BYTES = 96 * 1024
EDITOR_MAX_STRING_LENGTH = 4000
EDITOR_MAX_URL_LENGTH = 700
EDITOR_MAX_LIST_LENGTH = 160
EDITOR_MAX_OBJECT_KEYS = 160
EDITOR_MAX_DEPTH = 9
ATTACHABLE_ASSET_SLOTS = {
    "hero_image",
    "artwork_images",
    "thumbnails",
    "texture_assets",
    "portrait_image",
    "social_preview",
    "attached_assets",
}
ATTACHABLE_ASSET_TYPES = {"image", "thumbnail", "texture"}
UPLOAD_ASSET_ROLES = {"cover", "work", "portrait", "background", "invitation", "unused"}
MEDIA_REFERENCE_SECTION_ATTRS = ("scene_config_json", "asset_config_json", "content_config_json")
STUDIO_V3_RENDERER_KEY = "presence-studio-v2-room"
STUDIO_V3_POST_KEYS = (
    "renderer_key",
    "scene_config",
    "style_dna",
    "motion_config",
    "asset_config",
    "content_config",
    "roomkey_config",
    "enquiry_config",
    "locked_fields",
)
STUDIO_V3_EXPECTED_DRAFT_KEYS = {
    "room_id",
    "config_id",
    "version",
    "revision",
    "schema_version",
    "fingerprint",
}
STUDIO_V3_OWNED_SECTION_ATTRS = (
    "scene_config_json",
    "style_dna_json",
    "motion_config_json",
    "asset_config_json",
    "content_config_json",
    "roomkey_config_json",
    "enquiry_config_json",
)
_STUDIO_V3_FINGERPRINT_RE = re.compile(r"^[0-9a-f]{64}$")
_STUDIO_V3_PRIVATE_KEY_RE = re.compile(
    r"^(?:namedlooks|layerlocks|savepoints|ownermode|restore|compatibility|"
    r"sourceref|collectionsourceref|sourceprovenance|placementprovenance|"
    r"metadatarevision|activesavepointid|lastrestoredsavepointid)$",
    re.IGNORECASE,
)
_STUDIO_V3_SOURCE_REF_VALUE_RE = re.compile(r"^(?:work|collection|legacy-object):", re.IGNORECASE)

_RENDERER_KEY_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,119}$")
_LOCAL_PATH_RE = re.compile(
    r"(^[a-zA-Z]:[\\/])|(^\\\\)|(^file:)|(^/(Users|home|var|etc|tmp|private)/)|(^\.\.?[\\/])",
    re.IGNORECASE,
)
_SCRIPT_RE = re.compile(r"(<\s*script\b)|(\bon[a-z]+\s*=)|(\bjavascript\s*:)|(<\s*iframe\b)|(<\s*object\b)|(<\s*embed\b)", re.IGNORECASE)
_SECRET_KEY_RE = re.compile(r"(password|secret|private_key|access_token|refresh_token|api_key)", re.IGNORECASE)
_PUBLIC_REDACT_KEY_RE = re.compile(
    r"(created_by|updated_by|published_by|owner|platform_admin|internal_lifetime_free|filesystem_path|"
    r"private|secret|token|password|email|auth_subject|audit|draft|media_id|storage_key|signed_url)",
    re.IGNORECASE,
)
_EMAIL_RE = re.compile(r"[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+")


class PresenceEditorConfigError(ValueError):
    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.details = details or {}


class PresenceEditorDraftConflictError(PresenceEditorConfigError):
    """An expected Studio V3 base no longer identifies the locked config."""


def _studio_v3_stable_media_projection(value: Any) -> Any:
    if isinstance(value, list):
        return [_studio_v3_stable_media_projection(item) for item in value]
    if not isinstance(value, dict):
        return deepcopy(value)
    qualifies = (
        isinstance(value.get("media_id"), str)
        and bool(value.get("media_id", "").strip())
        and value.get("visibility") == "private_draft"
    )
    projected: dict[str, Any] = {}
    for key, item in value.items():
        if qualifies and key in {"url", "preview_expires_at"}:
            continue
        projected[str(key)] = _studio_v3_stable_media_projection(item)
    return projected


def studio_v3_comparable_config(config: PresenceEditableConfig) -> dict[str, Any]:
    """Return the exact ten-field stable-semantic fingerprint input."""

    return {
        "schema_version": EDITABLE_CONFIG_SCHEMA_VERSION,
        "renderer_key": config.renderer_key,
        "scene_config": _studio_v3_stable_media_projection(config.scene_config_json or {}),
        "style_dna": deepcopy(config.style_dna_json or {}),
        "motion_config": deepcopy(config.motion_config_json or {}),
        "asset_config": _studio_v3_stable_media_projection(config.asset_config_json or {}),
        "content_config": _studio_v3_stable_media_projection(config.content_config_json or {}),
        "roomkey_config": deepcopy(config.roomkey_config_json or {}),
        "enquiry_config": deepcopy(config.enquiry_config_json or {}),
        "locked_fields": deepcopy(config.locked_fields_json or {}),
    }


def canonicalize_studio_v3_comparable_config(config: dict[str, Any]) -> str:
    try:
        return _canonicalize_studio_v3_json(config)
    except (TypeError, ValueError) as exc:
        raise PresenceEditorConfigError("Studio V3 base config is not canonical JSON.") from exc


def _canonicalize_studio_v3_json(value: Any) -> str:
    """Match JSON.stringify after Unicode code-point key sorting."""

    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, int):
        if abs(value) > 9007199254740991:
            raise ValueError("integer is outside the JavaScript safe range")
        return str(value)
    if isinstance(value, float):
        return _canonicalize_studio_v3_number(value)
    if isinstance(value, str):
        return _studio_v3_json_string(value)
    if isinstance(value, list):
        return "[" + ",".join(_canonicalize_studio_v3_json(item) for item in value) + "]"
    if isinstance(value, dict):
        if not all(isinstance(key, str) for key in value):
            raise TypeError("Studio V3 JSON object keys must be strings")
        return "{" + ",".join(
            f"{_studio_v3_json_string(key)}:{_canonicalize_studio_v3_json(value[key])}"
            for key in sorted(value)
        ) + "}"
    raise TypeError("Studio V3 base config contains a non-JSON value")


def _studio_v3_json_string(value: str) -> str:
    normalized: list[str] = []
    index = 0
    while index < len(value):
        code = ord(value[index])
        if 0xD800 <= code <= 0xDBFF and index + 1 < len(value):
            low = ord(value[index + 1])
            if 0xDC00 <= low <= 0xDFFF:
                normalized.append(chr(0x10000 + ((code - 0xD800) << 10) + (low - 0xDC00)))
                index += 2
                continue
        normalized.append(value[index])
        index += 1
    encoded = json.dumps("".join(normalized), ensure_ascii=False, separators=(",", ":"))
    return "".join(
        f"\\u{ord(character):04x}" if 0xD800 <= ord(character) <= 0xDFFF else character
        for character in encoded
    )


def _canonicalize_studio_v3_number(value: float) -> str:
    if not math.isfinite(value):
        raise ValueError("Studio V3 numbers must be finite")
    if value.is_integer() and abs(value) > 9007199254740991:
        raise ValueError("integer is outside the JavaScript safe range")
    if value == 0:
        return "0"
    absolute = abs(value)
    shortest = repr(value).lower()
    if 1e-6 <= absolute < 1e21:
        expanded = format(Decimal(shortest), "f")
        if "." in expanded:
            expanded = expanded.rstrip("0").rstrip(".")
        return expanded
    if "e" not in shortest:
        shortest = format(value, ".15e")
    mantissa, exponent = shortest.split("e", 1)
    mantissa = mantissa.rstrip("0").rstrip(".")
    exponent_number = int(exponent)
    sign = "+" if exponent_number >= 0 else ""
    return f"{mantissa}e{sign}{exponent_number}"


def fingerprint_studio_v3_comparable_config(config: dict[str, Any]) -> str:
    projected = {
        "schema_version": config.get("schema_version"),
        "renderer_key": config.get("renderer_key"),
        "scene_config": _studio_v3_stable_media_projection(config.get("scene_config") or {}),
        "style_dna": deepcopy(config.get("style_dna") or {}),
        "motion_config": deepcopy(config.get("motion_config") or {}),
        "asset_config": _studio_v3_stable_media_projection(config.get("asset_config") or {}),
        "content_config": _studio_v3_stable_media_projection(config.get("content_config") or {}),
        "roomkey_config": deepcopy(config.get("roomkey_config") or {}),
        "enquiry_config": deepcopy(config.get("enquiry_config") or {}),
        "locked_fields": deepcopy(config.get("locked_fields") or {}),
    }
    canonical = canonicalize_studio_v3_comparable_config(projected)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def fingerprint_studio_v3_editable_config(config: PresenceEditableConfig) -> str:
    return fingerprint_studio_v3_comparable_config(studio_v3_comparable_config(config))


def studio_v3_config_identity(config: PresenceEditableConfig) -> dict[str, Any]:
    return {
        "room_id": int(config.room_id),
        "config_id": int(config.id),
        "version": int(config.version),
        "revision": int(config.revision or 1),
        "status": str(config.status),
        "schema_version": EDITABLE_CONFIG_SCHEMA_VERSION,
        "fingerprint": fingerprint_studio_v3_editable_config(config),
    }


def media_asset_records_available() -> bool:
    """Return whether optional V1C lifecycle records can be queried safely."""
    cache_key = "presence_media_asset_records_available"
    cached = current_app.extensions.get(cache_key)
    if isinstance(cached, bool):
        return cached
    try:
        available = bool(sqlalchemy_inspect(db.engine).has_table(PresenceMediaAsset.__tablename__))
        current_app.extensions[cache_key] = available
        return available
    except Exception:
        current_app.logger.warning(
            "Presence media capability lookup failed; retaining V1B media mode.",
            exc_info=True,
        )
        current_app.extensions[cache_key] = False
        return False


def media_capability_for_owner() -> dict[str, Any]:
    migration_ready = media_asset_records_available()
    storage_configured = private_draft_storage_configured()
    storage_verified = private_draft_storage_verified()
    private_active = migration_ready and private_draft_storage_enabled()
    if not migration_ready:
        reason = "media_migration_missing"
    elif not storage_configured:
        reason = "private_storage_not_configured"
    elif not storage_verified:
        reason = "private_storage_not_verified"
    else:
        reason = None
    return {
        "private_draft_media_active": private_active,
        "v1b_fallback_available": True,
        "migration_ready": migration_ready,
        "protected_storage_configured": storage_configured,
        "protected_storage_verified": storage_verified,
        "reason": reason,
        "owner_message": (
            "Uploaded images stay private in your Draft room until you open the room."
            if private_active
            else "Private draft media is not enabled on this environment. Use only public-safe images."
        ),
    }


def _json_size(value: Any) -> int:
    try:
        return len(json.dumps(value, ensure_ascii=False, sort_keys=True))
    except (TypeError, ValueError) as exc:
        raise PresenceEditorConfigError("Editable config must be JSON-serialisable.") from exc


def _looks_like_url_key(key: str) -> bool:
    key_l = key.lower()
    return any(part in key_l for part in ("url", "href", "src", "website", "image", "thumb", "asset"))


def _validate_public_or_relative_url(value: str, *, path: str) -> str:
    text = value.strip()
    if len(text) > EDITOR_MAX_URL_LENGTH:
        raise PresenceEditorConfigError(f"{path} exceeds {EDITOR_MAX_URL_LENGTH} characters.")
    if _LOCAL_PATH_RE.search(text):
        raise PresenceEditorConfigError(f"{path} cannot contain a local filesystem path.")
    if text.startswith("//"):
        raise PresenceEditorConfigError(f"{path} must not use a protocol-relative URL.")
    if text.startswith("/"):
        if ".." in text.split("/"):
            raise PresenceEditorConfigError(f"{path} must not traverse directories.")
        return text

    parsed = urlparse(text)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise PresenceEditorConfigError(f"{path} must be a public http(s) URL or a safe public asset path.")
    hostname = (parsed.hostname or "").strip().lower()
    if not hostname or hostname in {"localhost", "127.0.0.1", "0.0.0.0", "::1"}:
        raise PresenceEditorConfigError(f"{path} must not point at localhost.")
    if hostname.endswith(".local") or hostname.endswith(".internal"):
        raise PresenceEditorConfigError(f"{path} must not point at an internal host.")
    return text


def _clean_string(value: str, *, key: str, path: str) -> str:
    text = value.strip()
    if len(text) > EDITOR_MAX_STRING_LENGTH:
        raise PresenceEditorConfigError(f"{path} exceeds {EDITOR_MAX_STRING_LENGTH} characters.")
    if _SCRIPT_RE.search(text):
        raise PresenceEditorConfigError(f"{path} contains unsafe script-like content.")
    if _LOCAL_PATH_RE.search(text):
        raise PresenceEditorConfigError(f"{path} cannot contain a local filesystem path.")
    if text.lower().startswith(("data:", "vbscript:")):
        raise PresenceEditorConfigError(f"{path} cannot contain inline data or script URLs.")
    if _SECRET_KEY_RE.search(key) and text:
        raise PresenceEditorConfigError(f"{path} cannot store raw secrets.")

    parsed = urlparse(text)
    if parsed.scheme and parsed.scheme not in {"http", "https"}:
        raise PresenceEditorConfigError(f"{path} must not use the {parsed.scheme!r} URL scheme.")
    if _looks_like_url_key(key) and (parsed.scheme or text.startswith("/")):
        return _validate_public_or_relative_url(text, path=path)
    return text


def _normalise_json_value(value: Any, *, key: str = "", path: str = "config", depth: int = 0) -> Any:
    if depth > EDITOR_MAX_DEPTH:
        raise PresenceEditorConfigError(f"{path} exceeds maximum nesting depth.")
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        return _clean_string(value, key=key, path=path)
    if isinstance(value, list):
        if len(value) > EDITOR_MAX_LIST_LENGTH:
            raise PresenceEditorConfigError(f"{path} contains too many items.")
        return [
            _normalise_json_value(item, key=key, path=f"{path}[{idx}]", depth=depth + 1)
            for idx, item in enumerate(value)
        ]
    if isinstance(value, dict):
        if len(value) > EDITOR_MAX_OBJECT_KEYS:
            raise PresenceEditorConfigError(f"{path} contains too many fields.")
        cleaned: dict[str, Any] = {}
        for raw_key, raw_value in value.items():
            child_key = str(raw_key or "").strip()
            if not child_key:
                continue
            if len(child_key) > 120:
                raise PresenceEditorConfigError(f"{path} contains an overlong field name.")
            if _SECRET_KEY_RE.search(child_key) and raw_value not in (None, "", [], {}):
                raise PresenceEditorConfigError(f"{path}.{child_key} cannot store raw secrets.")
            cleaned[child_key] = _normalise_json_value(
                raw_value,
                key=child_key,
                path=f"{path}.{child_key}",
                depth=depth + 1,
            )
        return cleaned
    raise PresenceEditorConfigError(f"{path} contains unsupported JSON value.")


def normalise_editor_section(value: Any, *, section: str) -> dict[str, Any]:
    if value in (None, ""):
        return {}
    if not isinstance(value, dict):
        raise PresenceEditorConfigError(f"{section} must be a JSON object.")
    cleaned = _normalise_json_value(value, key=section, path=section)
    if not isinstance(cleaned, dict):
        raise PresenceEditorConfigError(f"{section} must be a JSON object.")
    if _json_size(cleaned) > EDITOR_SECTION_MAX_BYTES:
        raise PresenceEditorConfigError(f"{section} exceeds {EDITOR_SECTION_MAX_BYTES} bytes.")
    return cleaned


def normalise_editor_payload(data: dict[str, Any], *, partial: bool = False) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise PresenceEditorConfigError("Editable config payload must be a JSON object.")
    source = data.get("config") if isinstance(data.get("config"), dict) else data
    payload: dict[str, Any] = {}

    if "renderer_key" in source:
        renderer_key = str(source.get("renderer_key") or "").strip() or None
        if renderer_key and not _RENDERER_KEY_RE.match(renderer_key):
            raise PresenceEditorConfigError("renderer_key contains unsupported characters.")
        payload["renderer_key"] = renderer_key
    elif not partial:
        payload["renderer_key"] = None

    for public_key, attr in EDITABLE_CONFIG_JSON_FIELDS.items():
        if public_key in source:
            payload[attr] = normalise_editor_section(source.get(public_key), section=public_key)
        elif attr in source:
            payload[attr] = normalise_editor_section(source.get(attr), section=public_key)
        elif not partial:
            payload[attr] = {}

    total_obj = {
        "renderer_key": payload.get("renderer_key"),
        **{key: payload.get(attr, {}) for key, attr in EDITABLE_CONFIG_JSON_FIELDS.items()},
    }
    if _json_size(total_obj) > EDITOR_CONFIG_MAX_BYTES:
        raise PresenceEditorConfigError(f"Editable config exceeds {EDITOR_CONFIG_MAX_BYTES} bytes.")
    return payload


def renderer_key_for_room(room: PresenceNode) -> str | None:
    metadata = room.node_metadata if isinstance(room.node_metadata, dict) else {}
    custom = metadata.get("custom_presence") if isinstance(metadata.get("custom_presence"), dict) else {}
    style = custom.get("style_dna") if isinstance(custom.get("style_dna"), dict) else {}
    public_style = custom.get("public_style_dna") if isinstance(custom.get("public_style_dna"), dict) else {}
    for candidate in (
        style.get("renderer_key"),
        public_style.get("renderer_key"),
        custom.get("renderer_key"),
        custom.get("custom_renderer_key"),
        metadata.get("custom_renderer_key"),
        metadata.get("renderer_key"),
    ):
        text = str(candidate or "").strip()
        if text:
            return text[:120]
    return None


def _work_payload(work: PresenceWork) -> dict[str, Any]:
    return {
        "id": work.id,
        "slug": work.slug or str(work.id),
        "title": work.title,
        "year": work.year,
        "medium": work.medium,
        "dimensions": work.dimensions,
        "caption": work.description,
        "description": work.description,
        "image_url": work.image_url,
        "thumbnail_url": work.thumbnail_url,
        "gallery_images": work.gallery_images or [],
        "alt_text": work.title,
        "sort_order": work.sort_order or 0,
        "is_visible": bool(work.is_visible),
    }


def build_default_editable_config(room: PresenceNode) -> dict[str, Any]:
    works = [
        _work_payload(work)
        for work in sorted(room.works, key=lambda row: (row.sort_order or 0, row.id or 0))
        if work.is_visible
    ]
    hero_work = next((work for work in works if work.get("image_url")), works[0] if works else None)
    renderer_key = renderer_key_for_room(room)
    return {
        "renderer_key": renderer_key,
        "scene_config_json": {
            "scenes": [
                {
                    "id": "artwork_field",
                    "label": "Artwork Field",
                    "title": room.hero_title or room.display_name,
                    "subtitle": room.hero_subtitle or room.headline,
                    "primary_artwork_slug": (hero_work or {}).get("slug"),
                    "intro_copy": room.short_bio or room.bio,
                    "action_labels": {
                        "primary": room.primary_cta_label or "Begin a conversation",
                        "work_advance": "Show next artwork",
                    },
                    "roomkey_provenance_text": "Opened via RoomKey",
                },
                {
                    "id": "work_wall",
                    "label": "Work Wall",
                    "artwork_order": [work.get("slug") for work in works],
                    "selected_work_slug": (hero_work or {}).get("slug"),
                    "work_detail_behaviour": "inline_detail_or_route",
                },
                {
                    "id": "practice_studio",
                    "label": "Practice Studio",
                    "about_title": "Practice Studio",
                    "note_cards_enabled": True,
                },
                {
                    "id": "calling_card",
                    "label": "Calling Card",
                    "contact_title": "Calling Card",
                    "enquiry_cta": room.primary_cta_label or "Begin a conversation",
                },
            ]
        },
        "style_dna_json": {
            "palette": {
                "accent": room.accent_color,
                "theme_preset": room.theme_preset,
                "visual_mood": room.visual_mood,
            },
            "typography": room.custom_typography_config or {},
            "spacing": room.custom_spacing_config or {},
            "background_treatment": "renderer_default",
            "artwork_treatment": "renderer_default",
        },
        "motion_config_json": {
            "transition_style": "renderer_default",
            "scene_transition_duration_ms": 800,
            "reduced_motion_fallback": True,
        },
        "asset_config_json": {
            "hero_image": {
                "url": room.hero_image_url or room.cover_image_url or room.profile_image_url,
                "alt_text": room.hero_title or room.display_name,
            },
            "artworks": works,
            "thumbnails": [
                {"slug": work.get("slug"), "url": work.get("thumbnail_url"), "alt_text": work.get("alt_text")}
                for work in works
                if work.get("thumbnail_url")
            ],
            "public_assets_only": True,
        },
        "content_config_json": {
            "display_name": room.display_name,
            "headline": room.headline,
            "hero_title": room.hero_title,
            "hero_subtitle": room.hero_subtitle,
            "about": {
                "short_bio": room.short_bio,
                "bio": room.bio,
                "long_story": room.long_story,
                "practice_statement": room.practice_statement,
                "curatorial_statement": room.curatorial_statement,
            },
            "works": works,
            "contact": {
                "location_label": room.location_label,
                "availability_status": room.availability_status,
                "contact_posture": "enquiry_form",
                "primary_cta_label": room.primary_cta_label,
                "primary_cta_url": room.primary_cta_url,
            },
        },
        "roomkey_config_json": {
            "entry_label": "Opened via RoomKey",
            "provenance_chip_text": "Opened via NFC/QR",
            "guest_entry_copy": "You have entered this Presence Room.",
            "invalid_copy": "This Room Key is not available.",
            "revoked_copy": "This Room Key has been revoked.",
            "show_save_to_garden": True,
        },
        "enquiry_config_json": {
            "cta_label": room.primary_cta_label or "Begin a conversation",
            "copy": "Use the Presence enquiry form to contact the owner.",
            "availability_status": room.availability_status,
            "delivery_posture": "backend_enquiry_capture",
        },
        "locked_fields_json": {},
    }


def _active_config_query(room: PresenceNode, status: str):
    return PresenceEditableConfig.query.filter_by(room_id=room.id, status=status)


def draft_config_for_room(
    room: PresenceNode,
    *,
    for_update: bool = False,
) -> PresenceEditableConfig | None:
    query = _active_config_query(room, "draft").order_by(PresenceEditableConfig.version.desc())
    if for_update:
        query = query.with_for_update()
    return query.first()


def published_config_for_room(
    room: PresenceNode,
    *,
    for_update: bool = False,
) -> PresenceEditableConfig | None:
    query = _active_config_query(room, "published").order_by(PresenceEditableConfig.version.desc())
    if for_update:
        query = query.with_for_update()
    return query.first()


def _max_version(room: PresenceNode) -> int:
    versions = [int(row.version or 0) for row in PresenceEditableConfig.query.filter_by(room_id=room.id).all()]
    return max(versions, default=0)


def _config_data(config: PresenceEditableConfig | None, room: PresenceNode) -> dict[str, Any]:
    if config is None:
        return build_default_editable_config(room)
    return {
        "renderer_key": config.renderer_key,
        "scene_config_json": deepcopy(config.scene_config_json or {}),
        "style_dna_json": deepcopy(config.style_dna_json or {}),
        "motion_config_json": deepcopy(config.motion_config_json or {}),
        "asset_config_json": deepcopy(config.asset_config_json or {}),
        "content_config_json": deepcopy(config.content_config_json or {}),
        "roomkey_config_json": deepcopy(config.roomkey_config_json or {}),
        "enquiry_config_json": deepcopy(config.enquiry_config_json or {}),
        "locked_fields_json": deepcopy(config.locked_fields_json or {}),
    }


def ensure_draft_config(room: PresenceNode, actor=None) -> tuple[PresenceEditableConfig, bool]:
    # Resolve optional V1C capability before this method starts a mutation.
    # Inspecting a table mid-transaction can disturb in-memory SQLite tests.
    media_asset_records_available()
    # Every legacy draft writer shares the exact row-lock discipline used by
    # the Studio V3 compare-and-replace contract. Without this lock a legacy
    # POST/PATCH can read a stale draft, wait behind V3's UPDATE, and then
    # overwrite the committed V3 values with the same next revision.
    draft = draft_config_for_room(room, for_update=True)
    if draft:
        return draft, False

    source = published_config_for_room(room)
    data = _config_data(source, room)
    now = now_utc()
    draft = PresenceEditableConfig(
        room_id=room.id,
        version=_max_version(room) + 1,
        revision=1,
        status="draft",
        created_by_user_id=getattr(actor, "id", None),
        updated_by_user_id=getattr(actor, "id", None),
        created_at=now,
        updated_at=now,
        **data,
    )
    db.session.add(draft)
    db.session.flush()
    return draft, True


def _deep_merge(existing: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    merged = deepcopy(existing or {})
    for key, value in (patch or {}).items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def update_draft_config(
    room: PresenceNode,
    actor,
    data: dict[str, Any],
    *,
    partial: bool = False,
) -> tuple[PresenceEditableConfig, bool]:
    draft, created = ensure_draft_config(room, actor)
    payload = normalise_editor_payload(data, partial=partial)
    if "renderer_key" in payload:
        draft.renderer_key = payload["renderer_key"]
    elif not draft.renderer_key:
        draft.renderer_key = renderer_key_for_room(room)

    for _public_key, attr in EDITABLE_CONFIG_JSON_FIELDS.items():
        if attr not in payload:
            continue
        existing = getattr(draft, attr) or {}
        setattr(draft, attr, _deep_merge(existing, payload[attr]) if partial else payload[attr])

    for attr in MEDIA_REFERENCE_SECTION_ATTRS:
        setattr(draft, attr, _secure_private_draft_references(getattr(draft, attr) or {}, room.id))
    _sync_draft_media_assignment_status(
        {attr: getattr(draft, attr) or {} for attr in MEDIA_REFERENCE_SECTION_ATTRS},
        room.id,
    )
    if not created:
        draft.revision = int(draft.revision or 1) + 1
    draft.updated_by_user_id = getattr(actor, "id", None)
    draft.updated_at = now_utc()
    return draft, created


def _normalise_studio_v3_expected(
    expected: Any,
    *,
    required_keys: set[str] | None = None,
) -> dict[str, Any]:
    keys = required_keys or STUDIO_V3_EXPECTED_DRAFT_KEYS
    if not isinstance(expected, dict) or set(expected) != keys:
        raise PresenceEditorConfigError(
            "Studio V3 expected identity must contain exactly the registered fields.",
            details={"required_fields": sorted(keys)},
        )
    normalized: dict[str, Any] = {}
    for key in ("room_id", "config_id", "version", "revision"):
        value = expected.get(key)
        if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
            raise PresenceEditorConfigError(f"expected.{key} must be a positive integer.")
        normalized[key] = value
    schema_version = expected.get("schema_version")
    if not isinstance(schema_version, str) or not schema_version.strip() or len(schema_version) > 120:
        raise PresenceEditorConfigError("expected.schema_version must be a non-empty schema token.")
    fingerprint = str(expected.get("fingerprint") or "").strip().lower()
    if not _STUDIO_V3_FINGERPRINT_RE.fullmatch(fingerprint):
        raise PresenceEditorConfigError("expected.fingerprint must be a lowercase SHA-256 digest.")
    normalized["schema_version"] = schema_version.strip()
    normalized["fingerprint"] = fingerprint
    return normalized


def lock_studio_v3_expected_config(
    room: PresenceNode,
    expected: dict[str, Any],
    *,
    allowed_statuses: set[str],
) -> PresenceEditableConfig:
    """Lock and compare one exact existing config without creating anything."""

    normalized = _normalise_studio_v3_expected(expected)
    if normalized["room_id"] != room.id:
        raise PresenceEditorDraftConflictError("Studio V3 base Room no longer matches.")
    config = (
        PresenceEditableConfig.query.filter(
            PresenceEditableConfig.id == normalized["config_id"],
            PresenceEditableConfig.room_id == room.id,
            PresenceEditableConfig.status.in_(allowed_statuses),
        )
        .with_for_update()
        .first()
    )
    if config is None:
        raise PresenceEditorDraftConflictError("Studio V3 base config is missing or no longer eligible.")
    current = studio_v3_config_identity(config)
    for field in ("room_id", "config_id", "version", "revision", "schema_version", "fingerprint"):
        if current[field] != normalized[field]:
            raise PresenceEditorDraftConflictError(
                "Studio V3 base config changed; reload before saving.",
                details={"mismatch": field},
            )
    return config


def _normalise_studio_v3_replacement_request(data: Any) -> tuple[dict[str, Any], dict[str, Any]]:
    if not isinstance(data, dict) or set(data) != {"expected", "config"}:
        raise PresenceEditorConfigError("Studio V3 replacement requires exactly expected and config.")
    expected = _normalise_studio_v3_expected(data.get("expected"))
    config = data.get("config")
    if not isinstance(config, dict) or set(config) != set(STUDIO_V3_POST_KEYS):
        raise PresenceEditorConfigError(
            "Studio V3 replacement config must contain exactly the nine transport fields.",
            details={"required_fields": list(STUDIO_V3_POST_KEYS)},
        )
    normalized = normalise_editor_payload(config, partial=False)
    if normalized.get("renderer_key") != STUDIO_V3_RENDERER_KEY:
        raise PresenceEditorConfigError("Studio V3 replacement requires the Studio V2 renderer key.")
    return expected, normalized


def _without_studio_v2(value: Any) -> dict[str, Any]:
    result = deepcopy(value or {}) if isinstance(value, dict) else {}
    result.pop("studio_v2", None)
    return result


def _validate_studio_v3_owned_replacement(
    draft: PresenceEditableConfig,
    normalized: dict[str, Any],
) -> None:
    for attr in STUDIO_V3_OWNED_SECTION_ATTRS:
        if _without_studio_v2(getattr(draft, attr) or {}) != _without_studio_v2(normalized.get(attr) or {}):
            public_key = next(key for key, field_attr in EDITABLE_CONFIG_JSON_FIELDS.items() if field_attr == attr)
            raise PresenceEditorConfigError(
                f"Studio V3 replacement cannot change unowned {public_key} fields."
            )
    if deepcopy(draft.locked_fields_json or {}) != deepcopy(normalized.get("locked_fields_json") or {}):
        raise PresenceEditorConfigError("Studio V3 replacement cannot change locked_fields.")
    for attr in STUDIO_V3_OWNED_SECTION_ATTRS:
        section = normalized.get(attr) or {}
        _reject_studio_v3_private_state_in_public_config(section.get("studio_v2") if isinstance(section, dict) else None)
        if attr not in MEDIA_REFERENCE_SECTION_ATTRS:
            _reject_unregistered_studio_v3_media_references(
                section.get("studio_v2") if isinstance(section, dict) else None,
                path=f"{attr}.studio_v2",
            )


def _reject_studio_v3_private_state_in_public_config(value: Any, path: str = "studio_v2") -> None:
    if isinstance(value, list):
        for index, item in enumerate(value):
            _reject_studio_v3_private_state_in_public_config(item, f"{path}[{index}]")
        return
    if not isinstance(value, dict):
        if isinstance(value, str) and _STUDIO_V3_SOURCE_REF_VALUE_RE.match(value.strip()):
            raise PresenceEditorConfigError("Studio V3 private source references cannot enter editable_config.")
        return
    for key, item in value.items():
        normalized_key = re.sub(r"[^a-z0-9]", "", str(key).lower())
        if normalized_key == "placements" and not re.fullmatch(
            r"studio_v2\.chambers\[\d+\]\.composition",
            path,
        ):
            raise PresenceEditorConfigError(
                f"Studio V3 private placements cannot enter editable_config at {path}.{key}."
            )
        if _STUDIO_V3_PRIVATE_KEY_RE.fullmatch(normalized_key):
            raise PresenceEditorConfigError(
                f"Studio V3 private metadata cannot enter editable_config at {path}.{key}."
            )
        _reject_studio_v3_private_state_in_public_config(item, f"{path}.{key}")


def _require_stable_private_draft_media_ids(value: Any, path: str) -> None:
    if isinstance(value, list):
        for index, item in enumerate(value):
            _require_stable_private_draft_media_ids(item, f"{path}[{index}]")
        return
    if not isinstance(value, dict):
        return
    if value.get("visibility") == "private_draft":
        media_id = value.get("media_id")
        if not isinstance(media_id, str) or not media_id.strip():
            raise PresenceEditorConfigError(
                f"Studio V3 private-draft media at {path} requires a stable media_id."
            )
    for key, item in value.items():
        _require_stable_private_draft_media_ids(item, f"{path}.{key}")


def _reject_unregistered_studio_v3_media_references(value: Any, *, path: str) -> None:
    """Keep private media in scene/asset/content where lifecycle handling exists."""

    if isinstance(value, list):
        for index, item in enumerate(value):
            _reject_unregistered_studio_v3_media_references(item, path=f"{path}[{index}]")
        return
    if not isinstance(value, dict):
        return
    normalized_keys = {
        re.sub(r"[^a-z0-9]", "", str(key).lower())
        for key in value
    }
    if value.get("visibility") == "private_draft" or normalized_keys.intersection(
        {"mediaid", "previewexpiresat", "signedurl", "privatereviewurl", "draftstoragekey"}
    ):
        raise PresenceEditorConfigError(
            f"Studio V3 media references are not registered for {path}."
        )
    for key, item in value.items():
        _reject_unregistered_studio_v3_media_references(item, path=f"{path}.{key}")


def _claimed_private_draft_media_ids(value: Any) -> set[str]:
    ids: set[str] = set()
    if isinstance(value, list):
        for item in value:
            ids.update(_claimed_private_draft_media_ids(item))
    elif isinstance(value, dict):
        media_id = value.get("media_id")
        if value.get("visibility") == "private_draft" and isinstance(media_id, str) and media_id.strip():
            ids.add(media_id)
        for item in value.values():
            ids.update(_claimed_private_draft_media_ids(item))
    return ids


def _lock_and_validate_studio_v3_media(
    room: PresenceNode,
    normalized: dict[str, Any],
) -> tuple[list[PresenceMediaAsset], set[str]]:
    if not media_asset_records_available():
        raise PresenceEditorConfigError("Studio V3 atomic replacement requires the media lifecycle table.")
    sections = {attr: normalized.get(attr) or {} for attr in MEDIA_REFERENCE_SECTION_ATTRS}
    for attr, section in sections.items():
        _require_stable_private_draft_media_ids(section, attr)
    all_ids = _media_reference_ids(sections, include_inventory=True)
    selected_ids = _media_reference_ids(sections, include_inventory=False)
    claimed_private_ids = _claimed_private_draft_media_ids(sections)
    referenced_rows = (
        PresenceMediaAsset.query.filter(PresenceMediaAsset.id.in_(all_ids)).with_for_update().all()
        if all_ids
        else []
    )
    referenced_by_id = {row.id: row for row in referenced_rows}
    owner_user_id = getattr(room, "owner_user_id", None)
    for media_id in all_ids:
        row = referenced_by_id.get(media_id)
        if (
            row is None
            or row.room_id != room.id
            or row.owner_user_id != owner_user_id
            or row.status == "deleted"
        ):
            raise PresenceEditorConfigError("Studio V3 media reference is not owned by this Room.")
        if media_id in claimed_private_ids and row.visibility != "private_draft":
            raise PresenceEditorConfigError("Studio V3 private-draft media claim does not match the media record.")
        if (
            media_id in selected_ids
            and row.visibility == "private_draft"
            and row.status not in {"draft_uploaded", "draft_attached", "orphaned", "ready"}
        ):
            raise PresenceEditorConfigError("Studio V3 selected private media is not attachable.")
    private_rows = (
        PresenceMediaAsset.query.filter_by(
            room_id=room.id,
            owner_user_id=owner_user_id,
            visibility="private_draft",
        )
        .with_for_update()
        .all()
    )
    return private_rows, selected_ids


def replace_existing_studio_v3_draft(
    room: PresenceNode,
    actor,
    data: dict[str, Any],
) -> tuple[PresenceEditableConfig, dict[str, Any]]:
    """Conditionally replace one existing draft; caller owns commit/rollback."""

    expected, normalized = _normalise_studio_v3_replacement_request(data)
    draft = lock_studio_v3_expected_config(room, expected, allowed_statuses={"draft"})
    _validate_studio_v3_owned_replacement(draft, normalized)
    private_rows, selected_ids = _lock_and_validate_studio_v3_media(room, normalized)

    secured_sections: dict[str, dict[str, Any]] = {}
    for attr in MEDIA_REFERENCE_SECTION_ATTRS:
        section = deepcopy(normalized.get(attr) or {})
        if isinstance(section.get("studio_v2"), dict):
            section["studio_v2"] = _secure_private_draft_references(section["studio_v2"], room.id)
        secured_sections[attr] = section
    draft.renderer_key = normalized["renderer_key"]
    for _public_key, attr in EDITABLE_CONFIG_JSON_FIELDS.items():
        value = secured_sections.get(attr, normalized.get(attr) or {})
        setattr(draft, attr, value)

    now = now_utc()
    for media_asset in private_rows:
        if media_asset.id in selected_ids:
            if media_asset.status in {"draft_uploaded", "orphaned", "ready"}:
                media_asset.status = "draft_attached"
                media_asset.updated_at = now
        elif media_asset.status == "draft_attached":
            media_asset.status = "orphaned"
            media_asset.updated_at = now

    draft.revision = int(draft.revision or 1) + 1
    draft.updated_by_user_id = getattr(actor, "id", None)
    draft.updated_at = now
    return draft, studio_v3_config_identity(draft)


def publish_draft_config(room: PresenceNode, actor) -> PresenceEditableConfig:
    draft = draft_config_for_room(room, for_update=True)
    if not draft:
        raise PresenceEditorConfigError("No draft config exists for this Room.")
    try:
        for attr in MEDIA_REFERENCE_SECTION_ATTRS:
            setattr(draft, attr, _promote_private_media_references(getattr(draft, attr) or {}, room.id))
    except PresenceMediaStorageError as exc:
        raise PresenceEditorConfigError(str(exc)) from exc
    published = published_config_for_room(room)
    now = now_utc()
    if published:
        published.status = "archived"
        published.archived_at = now
        published.updated_by_user_id = getattr(actor, "id", None)
        published.updated_at = now
    draft.status = "published"
    draft.published_by_user_id = getattr(actor, "id", None)
    draft.published_at = now
    draft.updated_by_user_id = getattr(actor, "id", None)
    draft.updated_at = now
    _mark_unused_private_media_orphaned(room.id)
    return draft


def rollback_published_config(room: PresenceNode, actor, *, version: int | None = None, config_id: int | None = None) -> PresenceEditableConfig:
    query = PresenceEditableConfig.query.filter(
        PresenceEditableConfig.room_id == room.id,
        PresenceEditableConfig.status.in_(["published", "archived"]),
    )
    if config_id is not None:
        query = query.filter(PresenceEditableConfig.id == int(config_id))
    elif version is not None:
        query = query.filter(PresenceEditableConfig.version == int(version))
    else:
        query = query.filter(PresenceEditableConfig.status == "archived")
    target = query.order_by(PresenceEditableConfig.version.desc()).first()
    if not target:
        raise PresenceEditorConfigError("Rollback target config was not found.")

    current = published_config_for_room(room)
    now = now_utc()
    if current:
        current.status = "archived"
        current.archived_at = now
        current.updated_by_user_id = getattr(actor, "id", None)
        current.updated_at = now

    data = _config_data(target, room)
    restored = PresenceEditableConfig(
        room_id=room.id,
        version=_max_version(room) + 1,
        revision=1,
        status="published",
        created_by_user_id=getattr(actor, "id", None),
        updated_by_user_id=getattr(actor, "id", None),
        published_by_user_id=getattr(actor, "id", None),
        created_at=now,
        updated_at=now,
        published_at=now,
        **data,
    )
    db.session.add(restored)
    return restored


def history_for_room(room: PresenceNode) -> list[PresenceEditableConfig]:
    return (
        PresenceEditableConfig.query.filter_by(room_id=room.id)
        .order_by(PresenceEditableConfig.version.desc(), PresenceEditableConfig.id.desc())
        .all()
    )


def _public_redact(value: Any) -> Any:
    if isinstance(value, list):
        cleaned_list = []
        for item in value:
            cleaned = _public_redact(item)
            if cleaned in (None, {}, []):
                continue
            if isinstance(cleaned, dict):
                status = str(cleaned.get("status") or cleaned.get("visibility") or "public").lower()
                if status in {"draft", "private", "unpublished", "archived"}:
                    continue
            cleaned_list.append(cleaned)
        return cleaned_list
    if isinstance(value, dict):
        cleaned: dict[str, Any] = {}
        for key, item in value.items():
            key_text = str(key)
            if _PUBLIC_REDACT_KEY_RE.search(key_text):
                continue
            child = _public_redact(item)
            if child in (None, {}, []):
                continue
            cleaned[key_text] = child
        return cleaned
    if isinstance(value, str):
        if _EMAIL_RE.search(value):
            return None
        if _LOCAL_PATH_RE.search(value):
            return None
        if _SCRIPT_RE.search(value):
            return None
        return value
    return value


def serialize_editor_config(config: PresenceEditableConfig | None) -> dict[str, Any] | None:
    if not config:
        return None
    return {
        "id": config.id,
        "room_id": config.room_id,
        "schema_version": EDITABLE_CONFIG_SCHEMA_VERSION,
        "version": config.version,
        "revision": int(config.revision or 1),
        "status": config.status,
        "renderer_key": config.renderer_key,
        "scene_config": _owner_media_section(config, "scene_config_json"),
        "style_dna": config.style_dna_json or {},
        "motion_config": config.motion_config_json or {},
        "asset_config": _owner_media_section(config, "asset_config_json"),
        "content_config": _owner_media_section(config, "content_config_json"),
        "roomkey_config": config.roomkey_config_json or {},
        "enquiry_config": config.enquiry_config_json or {},
        "locked_fields": config.locked_fields_json or {},
        "created_by_user_id": config.created_by_user_id,
        "updated_by_user_id": config.updated_by_user_id,
        "published_by_user_id": config.published_by_user_id,
        "created_at": config.created_at.isoformat() if config.created_at else None,
        "updated_at": config.updated_at.isoformat() if config.updated_at else None,
        "published_at": config.published_at.isoformat() if config.published_at else None,
        "archived_at": config.archived_at.isoformat() if config.archived_at else None,
    }


def serialize_public_editable_config(config: PresenceEditableConfig | None, *, preview: bool = False) -> dict[str, Any] | None:
    if not config:
        return None
    public_assets = (
        _hydrate_private_media_references(config.asset_config_json or {}, config.room_id)
        if preview
        else deepcopy(config.asset_config_json or {})
    )
    # This is draft inventory for the editor picker, not visible room content.
    # Do not expose unused uploads through public or preview-render payloads.
    public_assets.pop("attached_assets", None)
    safe = {
        "schema_version": EDITABLE_CONFIG_SCHEMA_VERSION,
        "version": config.version,
        "status": "preview" if preview else "published",
        "renderer_key": config.renderer_key,
        "published_at": config.published_at.isoformat() if config.published_at else None,
        "scene_config": (
            _hydrate_private_media_references(config.scene_config_json or {}, config.room_id)
            if preview
            else config.scene_config_json or {}
        ),
        "style_dna": config.style_dna_json or {},
        "motion_config": config.motion_config_json or {},
        "asset_config": public_assets,
        "content_config": (
            _hydrate_private_media_references(config.content_config_json or {}, config.room_id)
            if preview
            else config.content_config_json or {}
        ),
        "roomkey_config": config.roomkey_config_json or {},
        "enquiry_config": config.enquiry_config_json or {},
        "locked_fields": config.locked_fields_json or {},
    }
    return _public_redact(safe)


def public_config_for_room(room: PresenceNode) -> dict[str, Any] | None:
    return serialize_public_editable_config(published_config_for_room(room))


def preview_payload_for_room(room: PresenceNode, actor) -> dict[str, Any]:
    draft, created = ensure_draft_config(room, actor)
    expires_at = int(time.time()) + 15 * 60
    token_source = f"{room.id}:{draft.id}:{draft.version}:{getattr(actor, 'id', None)}:{expires_at}"
    secret = str(current_app.config.get("SECRET_KEY") or "presence-preview-secret")
    digest = hmac.new(secret.encode("utf-8"), token_source.encode("utf-8"), hashlib.sha256).hexdigest()
    return {
        "created_draft": created,
        "preview": True,
        "expires_at": expires_at,
        "preview_token": f"{expires_at}.{digest}",
        "preview_url": f"/studio/{room.id}/preview?presencePreviewToken={expires_at}.{digest}",
        "editable_config": serialize_public_editable_config(draft, preview=True),
        "draft": serialize_editor_config(draft),
    }


def _asset_from_value(value: Any, *, source: str, slot: str | None = None) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if isinstance(value, str):
        try:
            url = _validate_public_or_relative_url(value, path=f"{source}.{slot or 'url'}")
        except PresenceEditorConfigError:
            return []
        rows.append({"url": url, "source": source, "slot": slot, "asset_type": "image"})
    elif isinstance(value, dict):
        url = value.get("url") or value.get("image_url") or value.get("thumbnail_url") or value.get("src")
        if isinstance(url, str):
            try:
                rows.append(
                    {
                        "url": _validate_public_or_relative_url(url, path=f"{source}.{slot or 'url'}"),
                        "alt_text": value.get("alt_text") or value.get("alt") or value.get("title"),
                        "source": source,
                        "slot": slot,
                        "asset_type": value.get("asset_type") or "image",
                    }
                )
            except PresenceEditorConfigError:
                return []
        else:
            for child_key, child_value in value.items():
                rows.extend(_asset_from_value(child_value, source=source, slot=str(child_key)))
    elif isinstance(value, list):
        for idx, item in enumerate(value):
            rows.extend(_asset_from_value(item, source=source, slot=f"{slot or 'asset'}[{idx}]"))
    return rows


def collect_room_assets(room: PresenceNode) -> list[dict[str, Any]]:
    assets: list[dict[str, Any]] = []
    node_fields = {
        "profile_image": room.profile_image_url,
        "cover_image": room.cover_image_url,
        "hero_image": room.hero_image_url,
        "landing_background": room.landing_background_url,
        "social_preview": room.social_preview_image_url,
    }
    for slot, url in node_fields.items():
        assets.extend(_asset_from_value(url, source="presence_node", slot=slot))
    for work in sorted(room.works, key=lambda row: (row.sort_order or 0, row.id or 0)):
        assets.extend(_asset_from_value(work.image_url, source="presence_work", slot=f"{work.id}.image"))
        assets.extend(_asset_from_value(work.thumbnail_url, source="presence_work", slot=f"{work.id}.thumbnail"))
        assets.extend(_asset_from_value(work.gallery_images or [], source="presence_work", slot=f"{work.id}.gallery"))
    for collection in sorted(room.collections, key=lambda row: (row.sort_order or 0, row.id or 0)):
        if isinstance(collection, PresenceCollection):
            assets.extend(_asset_from_value(collection.cover_image_url, source="presence_collection", slot=f"{collection.id}.cover"))

    for config in (draft_config_for_room(room), published_config_for_room(room)):
        if config:
            assets.extend(_asset_from_value(config.asset_config_json or {}, source=f"editable_config:{config.status}", slot="asset_config"))
    if media_asset_records_available():
        for media_asset in PresenceMediaAsset.query.filter_by(room_id=room.id).filter(PresenceMediaAsset.status != "deleted").all():
            assets.append(serialize_media_asset_for_owner(media_asset))

    seen: set[str] = set()
    unique_assets: list[dict[str, Any]] = []
    for asset in assets:
        url = asset.get("url")
        if not url or url in seen:
            continue
        seen.add(url)
        unique_assets.append(asset)
    return unique_assets


def attach_asset_to_draft(room: PresenceNode, actor, data: dict[str, Any]) -> PresenceEditableConfig:
    slot = str(data.get("slot") or "attached_assets").strip()
    if slot not in ATTACHABLE_ASSET_SLOTS:
        raise PresenceEditorConfigError("Unsupported asset slot.", details={"slot": sorted(ATTACHABLE_ASSET_SLOTS)})
    asset_type = str(data.get("asset_type") or "image").strip()
    if asset_type not in ATTACHABLE_ASSET_TYPES:
        raise PresenceEditorConfigError("Unsupported asset_type.", details={"asset_type": sorted(ATTACHABLE_ASSET_TYPES)})
    url = _validate_public_or_relative_url(str(data.get("url") or "").strip(), path="asset.url")
    alt_text = _clean_string(str(data.get("alt_text") or data.get("alt") or "").strip(), key="alt_text", path="asset.alt_text") if (data.get("alt_text") or data.get("alt")) else None
    draft, created = ensure_draft_config(room, actor)
    asset_config = deepcopy(draft.asset_config_json or {})
    asset = {
        "url": url,
        "asset_type": asset_type,
        "alt_text": alt_text,
        "status": "published",
        "visibility": "public",
    }
    existing = asset_config.get(slot)
    if isinstance(existing, list):
        existing.append(asset)
    elif existing:
        asset_config[slot] = [existing, asset]
    else:
        asset_config[slot] = [asset]
    draft.asset_config_json = normalise_editor_section(asset_config, section="asset_config")
    if not created:
        draft.revision = int(draft.revision or 1) + 1
    draft.updated_by_user_id = getattr(actor, "id", None)
    draft.updated_at = now_utc()
    return draft


def validate_uploaded_asset_fields(*, role: str = "unused", alt_text: str | None = None) -> tuple[str, str | None]:
    clean_role = str(role or "unused").strip().lower()
    if clean_role not in UPLOAD_ASSET_ROLES:
        raise PresenceEditorConfigError("Choose a supported image role.")
    clean_alt = (
        _clean_string(str(alt_text or "").strip(), key="alt_text", path="asset.alt_text")
        if alt_text
        else None
    )
    return clean_role, clean_alt


def attach_uploaded_asset_to_draft(
    room: PresenceNode,
    actor,
    *,
    url: str,
    alt_text: str | None,
    media_id: str,
    role: str = "unused",
    mime_type: str | None = None,
    size_bytes: int | None = None,
    visibility: str = "public_unlisted",
    width: int | None = None,
    height: int | None = None,
) -> tuple[PresenceEditableConfig, dict[str, Any]]:
    clean_url = _validate_public_or_relative_url(str(url or "").strip(), path="asset.url") if url else ""
    clean_role, clean_alt = validate_uploaded_asset_fields(role=role, alt_text=alt_text)
    clean_media_id = _clean_string(str(media_id or "").strip(), key="media_id", path="asset.media_id")
    asset: dict[str, Any] = {
        "media_id": clean_media_id,
        "asset_type": "image",
        "role": clean_role,
        "alt_text": clean_alt,
        "status": "draft_uploaded",
        "visibility": visibility,
    }
    if visibility != "private_draft":
        asset["url"] = clean_url
    if mime_type in {"image/jpeg", "image/png", "image/webp"}:
        asset["mime_type"] = mime_type
    if isinstance(size_bytes, int) and size_bytes > 0:
        asset["size_bytes"] = size_bytes
    if isinstance(width, int) and width > 0:
        asset["width"] = width
    if isinstance(height, int) and height > 0:
        asset["height"] = height

    draft, created = ensure_draft_config(room, actor)
    asset_config = deepcopy(draft.asset_config_json or {})
    existing = asset_config.get("attached_assets")
    items = list(existing) if isinstance(existing, list) else ([existing] if existing else [])
    items.append(asset)
    asset_config["attached_assets"] = items
    draft.asset_config_json = normalise_editor_section(asset_config, section="asset_config")
    if not created:
        draft.revision = int(draft.revision or 1) + 1
    draft.updated_by_user_id = getattr(actor, "id", None)
    draft.updated_at = now_utc()
    response_asset = deepcopy(asset)
    if clean_url:
        response_asset["url"] = clean_url
    return draft, response_asset


def serialize_media_asset_for_owner(media_asset: PresenceMediaAsset) -> dict[str, Any]:
    url, expires_at = draft_media_read_url(media_asset)
    item: dict[str, Any] = {
        "media_id": media_asset.id,
        "url": url,
        "asset_type": "image",
        "role": media_asset.role,
        "alt_text": media_asset.alt_text,
        "mime_type": media_asset.mime_type,
        "size_bytes": media_asset.size_bytes,
        "width": media_asset.width,
        "height": media_asset.height,
        "status": media_asset.status,
        "visibility": media_asset.visibility,
        "source": "uploaded_image",
        "slot": "attached_assets",
    }
    if expires_at:
        item["preview_expires_at"] = expires_at
    if media_asset.focal_point_json:
        item["focal_point"] = deepcopy(media_asset.focal_point_json)
    return item


def _owner_media_section(config: PresenceEditableConfig, attr: str) -> dict[str, Any]:
    section = getattr(config, attr) or {}
    if config.status != "draft":
        return section
    return _hydrate_private_media_references(section, config.room_id)


def delete_unused_media_asset(room: PresenceNode, media_id: str) -> bool:
    if not media_asset_records_available():
        raise PresenceEditorConfigError("Private draft media is not enabled on this environment.")
    # Preserve the global writer lock order: draft first, then referenced media.
    # This matches V3 replacement and avoids a delete-vs-save lock inversion.
    draft = draft_config_for_room(room, for_update=True)
    media_asset = PresenceMediaAsset.query.filter_by(id=media_id, room_id=room.id).with_for_update().first()
    if not media_asset:
        raise PresenceEditorConfigError("That image was not found.")
    if media_asset.status == "published" or media_asset.visibility == "public_published":
        raise PresenceEditorConfigError("This image is live. Replace it in your draft before deleting it.")
    selected = _media_reference_ids((draft.asset_config_json if draft else {}) or {}, include_inventory=False)
    if media_asset.id in selected:
        raise PresenceEditorConfigError("Remove this image from your draft before deleting it.")
    delete_private_media_object(media_asset)
    media_asset.status = "deleted"
    media_asset.deleted_at = now_utc()
    media_asset.updated_at = now_utc()
    return True


def cleanup_orphaned_private_media(room: PresenceNode, *, minimum_age_seconds: int = 86400) -> int:
    if not media_asset_records_available():
        return 0
    # Match every draft/media writer: lock the draft before selecting media.
    # The media query must also lock so its orphaned predicate is rechecked
    # after a concurrent V3 replacement finishes reattaching an asset.
    draft_config_for_room(room, for_update=True)
    cutoff = now_utc().timestamp() - max(0, int(minimum_age_seconds))
    deleted = 0
    rows = (
        PresenceMediaAsset.query.filter_by(
            room_id=room.id,
            status="orphaned",
            visibility="private_draft",
        )
        .with_for_update()
        .all()
    )
    for media_asset in rows:
        if media_asset.created_at and media_asset.created_at.timestamp() > cutoff:
            continue
        delete_private_media_object(media_asset)
        media_asset.status = "deleted"
        media_asset.deleted_at = now_utc()
        media_asset.updated_at = now_utc()
        deleted += 1
    return deleted


def _media_by_id(room_id: int) -> dict[str, PresenceMediaAsset]:
    if not media_asset_records_available():
        return {}
    return {row.id: row for row in PresenceMediaAsset.query.filter_by(room_id=room_id).all()}


def _media_reference_ids(value: Any, *, include_inventory: bool = False) -> set[str]:
    ids: set[str] = set()
    if isinstance(value, list):
        for item in value:
            ids.update(_media_reference_ids(item, include_inventory=include_inventory))
    elif isinstance(value, dict):
        media_id = value.get("media_id")
        if isinstance(media_id, str) and media_id:
            ids.add(media_id)
        for key, item in value.items():
            if not include_inventory and key == "attached_assets":
                continue
            ids.update(_media_reference_ids(item, include_inventory=include_inventory))
    return ids


def _has_private_draft_reference(value: Any) -> bool:
    if isinstance(value, list):
        return any(_has_private_draft_reference(item) for item in value)
    if isinstance(value, dict):
        if str(value.get("visibility") or "") == "private_draft":
            return True
        return any(_has_private_draft_reference(item) for item in value.values())
    return False


def _walk_media_refs(value: Any, rows: dict[str, PresenceMediaAsset], transform) -> Any:
    if isinstance(value, list):
        return [_walk_media_refs(item, rows, transform) for item in value]
    if not isinstance(value, dict):
        return deepcopy(value)
    updated = {key: _walk_media_refs(item, rows, transform) for key, item in value.items()}
    media_id = updated.get("media_id")
    media_asset = rows.get(media_id) if isinstance(media_id, str) else None
    return transform(updated, media_asset) if media_asset else updated


def _secure_private_draft_references(asset_config: dict[str, Any], room_id: int) -> dict[str, Any]:
    rows = _media_by_id(room_id)

    def secure(item: dict[str, Any], media_asset: PresenceMediaAsset) -> dict[str, Any]:
        if media_asset.visibility != "private_draft":
            return item
        item.pop("url", None)
        item.pop("image_url", None)
        item.pop("thumbnail_url", None)
        item.pop("preview_expires_at", None)
        item["visibility"] = "private_draft"
        return item

    return _walk_media_refs(asset_config, rows, secure)


def _hydrate_private_media_references(asset_config: dict[str, Any], room_id: int) -> dict[str, Any]:
    rows = _media_by_id(room_id)

    def hydrate(item: dict[str, Any], media_asset: PresenceMediaAsset) -> dict[str, Any]:
        if media_asset.visibility == "private_draft":
            url, expires_at = draft_media_read_url(media_asset)
            item["url"] = url
            if expires_at:
                item["preview_expires_at"] = expires_at
        elif media_asset.public_url:
            item["url"] = media_asset.public_url
        return item

    return _walk_media_refs(asset_config, rows, hydrate)


def _sync_draft_media_assignment_status(asset_config: dict[str, Any], room_id: int) -> None:
    if not media_asset_records_available():
        return
    selected = _media_reference_ids(asset_config, include_inventory=False)
    for media_asset in PresenceMediaAsset.query.filter_by(room_id=room_id, visibility="private_draft").all():
        if media_asset.id in selected and media_asset.status in {"draft_uploaded", "orphaned", "ready"}:
            media_asset.status = "draft_attached"
            media_asset.updated_at = now_utc()


def _promote_private_media_references(asset_config: dict[str, Any], room_id: int) -> dict[str, Any]:
    if not media_asset_records_available():
        if _has_private_draft_reference(asset_config):
            raise PresenceMediaStorageError("Protected draft images cannot be published until private media setup is restored.")
        return deepcopy(asset_config)
    rows = _media_by_id(room_id)
    selected = _media_reference_ids(asset_config, include_inventory=False)

    def promote(item: dict[str, Any], media_asset: PresenceMediaAsset) -> dict[str, Any]:
        if media_asset.id not in selected or media_asset.visibility != "private_draft":
            return item
        public_media = promote_presence_media(media_asset, room_id=room_id)
        media_asset.public_url = public_media.url
        media_asset.published_storage_key = public_media.storage_path
        media_asset.visibility = "public_published"
        media_asset.status = "published"
        media_asset.published_at = now_utc()
        media_asset.updated_at = now_utc()
        item.pop("preview_expires_at", None)
        item["url"] = public_media.url
        item["status"] = "published"
        item["visibility"] = "public_published"
        return item

    return _walk_media_refs(asset_config, rows, promote)


def _mark_unused_private_media_orphaned(room_id: int) -> None:
    if not media_asset_records_available():
        return
    for media_asset in PresenceMediaAsset.query.filter_by(room_id=room_id, visibility="private_draft").all():
        if media_asset.status in {"draft_uploaded", "draft_attached", "ready"}:
            media_asset.status = "orphaned"
            media_asset.updated_at = now_utc()
