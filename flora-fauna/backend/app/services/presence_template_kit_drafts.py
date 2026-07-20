from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from ..models import PresenceEditableConfig, PresenceNode, User

from .presence_editor_config import (
    draft_config_for_room,
    media_asset_records_available,
    published_config_for_room,
    update_draft_config,
)
from .presence_service import create_presence_node


PRESENCE_STUDIO_ROOM_SCHEMA_VERSION = "presence-studio-room-v1"
TEMPLATE_KIT_DRAFT_CONTRACT_VERSION = "presence-editable-config-compat-v1"
TEMPLATE_KIT_RENDERER_KEY = "studio-room-template-kit-v1"
TEMPLATE_KIT_CONTRACT_SCHEMA_VERSION = "presence-studio-template-kit-contract-v1"
_TEMPLATE_KIT_CONTRACT_PATH = Path(__file__).resolve().parents[1] / "data" / "presence_studio_template_kits.json"


def _load_template_kit_contract() -> dict[str, Any]:
    with _TEMPLATE_KIT_CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        contract = json.load(handle)
    if contract.get("schemaVersion") != TEMPLATE_KIT_CONTRACT_SCHEMA_VERSION:
        raise RuntimeError("Presence Studio TemplateKit contract schema version mismatch.")
    if contract.get("studioRoomSchemaVersion") != PRESENCE_STUDIO_ROOM_SCHEMA_VERSION:
        raise RuntimeError("Presence Studio TemplateKit contract room schema version mismatch.")
    kits = contract.get("kits")
    if not isinstance(kits, list) or not kits:
        raise RuntimeError("Presence Studio TemplateKit contract requires a non-empty kits list.")
    seen: set[str] = set()
    for entry in kits:
        if not isinstance(entry, dict):
            raise RuntimeError("Presence Studio TemplateKit contract entries must be objects.")
        kit_id = str(entry.get("id") or "").strip()
        if not kit_id or kit_id in seen:
            raise RuntimeError("Presence Studio TemplateKit contract contains an invalid or duplicate kit id.")
        seen.add(kit_id)
        support_state = str(entry.get("supportState") or "").strip()
        if support_state not in {"primary", "candidate", "deferred"}:
            raise RuntimeError(f"Presence Studio TemplateKit {kit_id} has an invalid support state.")
        if not isinstance(entry.get("ownerCreatable"), bool):
            raise RuntimeError(f"Presence Studio TemplateKit {kit_id} must declare ownerCreatable.")
        if str(entry.get("schemaVersion") or "").strip() != PRESENCE_STUDIO_ROOM_SCHEMA_VERSION:
            raise RuntimeError(f"Presence Studio TemplateKit {kit_id} has an unsupported Studio Room schema version.")
        _template_kit_defaults_from_contract_entry(entry)
    return contract


def _template_kit_defaults_from_contract_entry(entry: dict[str, Any]) -> dict[str, str]:
    defaults = entry.get("backendDefaults")
    kit_id = str(entry.get("id") or "").strip()
    display_name = str(entry.get("displayName") or "").strip()
    if not display_name:
        raise RuntimeError(f"Presence Studio TemplateKit {kit_id} is missing displayName.")
    if not isinstance(defaults, dict):
        raise RuntimeError(f"Presence Studio TemplateKit {kit_id} is missing backendDefaults.")
    required = ("description", "node_type", "display_mode", "room_type", "theme_preset")
    missing = [key for key in required if not str(defaults.get(key) or "").strip()]
    if missing:
        raise RuntimeError(f"Presence Studio TemplateKit {kit_id} is missing backend defaults: {', '.join(missing)}.")
    return {
        "name": display_name,
        "description": str(defaults["description"]).strip(),
        "node_type": str(defaults["node_type"]).strip(),
        "display_mode": str(defaults["display_mode"]).strip(),
        "room_type": str(defaults["room_type"]).strip(),
        "theme_preset": str(defaults["theme_preset"]).strip(),
        "support_state": str(entry.get("supportState") or "").strip(),
        "owner_creatable": "true" if entry.get("ownerCreatable") else "false",
        "schema_version": str(entry.get("schemaVersion") or "").strip(),
        "version": str(entry.get("version") or "").strip() or "1",
    }


def _primary_template_kits_from_contract(contract: dict[str, Any]) -> dict[str, dict[str, str]]:
    primary: dict[str, dict[str, str]] = {}
    for entry in contract["kits"]:
        support_state = str(entry.get("supportState") or "").strip()
        if support_state == "primary" and entry.get("ownerCreatable") is True:
            primary[str(entry["id"])] = _template_kit_defaults_from_contract_entry(entry)
    return primary


def _non_owner_creatable_template_kit_ids(contract: dict[str, Any]) -> set[str]:
    return {
        str(entry["id"])
        for entry in contract["kits"]
        if entry.get("ownerCreatable") is not True or str(entry.get("supportState") or "").strip() != "primary"
    }


_TEMPLATE_KIT_CONTRACT = _load_template_kit_contract()
PRIMARY_TEMPLATE_KITS: dict[str, dict[str, str]] = _primary_template_kits_from_contract(_TEMPLATE_KIT_CONTRACT)
CANDIDATE_TEMPLATE_KITS = _non_owner_creatable_template_kit_ids(_TEMPLATE_KIT_CONTRACT)

_RESTRICTED_COMPACT_KEYS = {
    "accesstoken",
    "apikey",
    "authsubject",
    "contactemail",
    "contactphone",
    "draftconfig",
    "draftstoragekey",
    "editableconfig",
    "editoronly",
    "email",
    "internal",
    "internallifetimefree",
    "motionconfig",
    "owneremail",
    "owneruserid",
    "password",
    "phone",
    "platformadmin",
    "privatekey",
    "publicemail",
    "publicphone",
    "raweditableconfig",
    "refreshtoken",
    "secret",
    "signedurl",
    "styledna",
}

_EDITABLE_TEXT_CONTENT_KEYS = {"title", "body"}
_EDITABLE_OBJECT_LABEL_TYPES = {
    "badge",
    "contact",
    "credential",
    "cta",
    "headline",
    "image",
    "link",
    "link-card",
    "note",
    "portal",
    "proof",
    "proof-card",
    "service",
    "service-card",
    "testimonial",
    "text",
    "work",
    "work-card",
}
_EDITABLE_CONTENT_KEYS_BY_TYPE = {
    "text": _EDITABLE_TEXT_CONTENT_KEYS,
    "headline": _EDITABLE_TEXT_CONTENT_KEYS,
    "note": _EDITABLE_TEXT_CONTENT_KEYS,
    "image": _EDITABLE_TEXT_CONTENT_KEYS,
    "work": _EDITABLE_TEXT_CONTENT_KEYS,
    "work-card": _EDITABLE_TEXT_CONTENT_KEYS,
    "service": _EDITABLE_TEXT_CONTENT_KEYS | {"priceLabel", "price_label", "durationLabel", "duration_label"},
    "service-card": _EDITABLE_TEXT_CONTENT_KEYS | {"priceLabel", "price_label", "durationLabel", "duration_label"},
    "proof": _EDITABLE_TEXT_CONTENT_KEYS | {"quote", "attribution", "source"},
    "proof-card": _EDITABLE_TEXT_CONTENT_KEYS | {"quote", "attribution", "source"},
    "testimonial": _EDITABLE_TEXT_CONTENT_KEYS | {"quote", "attribution", "source"},
    "link": _EDITABLE_TEXT_CONTENT_KEYS | {"action", "url", "linkType", "link_type"},
    "link-card": _EDITABLE_TEXT_CONTENT_KEYS | {"action", "url", "linkType", "link_type"},
    "portal": _EDITABLE_TEXT_CONTENT_KEYS | {"action", "url", "linkType", "link_type"},
    "credential": _EDITABLE_TEXT_CONTENT_KEYS | {"issuer", "detail"},
    "badge": _EDITABLE_TEXT_CONTENT_KEYS | {"issuer", "detail"},
    "cta": _EDITABLE_TEXT_CONTENT_KEYS | {"action"},
    "contact": _EDITABLE_TEXT_CONTENT_KEYS,
}
_ACTION_EDITABLE_OBJECT_TYPES = {"cta", "link", "link-card", "portal"}
_CTA_TARGETS = {"commission", "quote", "booking", "project", "contact"}


class TemplateKitDraftPersistenceError(ValueError):
    def __init__(
        self,
        message: str,
        *,
        status: int = 422,
        code: str = "validation_error",
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.status = status
        self.code = code
        self.details = details or {}


def owner_creatable_template_kit_ids() -> list[str]:
    return list(PRIMARY_TEMPLATE_KITS.keys())


def template_kit_contract_summary() -> dict[str, Any]:
    kits: list[dict[str, Any]] = []
    for entry in _TEMPLATE_KIT_CONTRACT["kits"]:
        support_state = str(entry.get("supportState") or "").strip()
        owner_creatable = bool(entry.get("ownerCreatable"))
        kits.append(
            {
                "id": str(entry["id"]),
                "display_name": str(entry["displayName"]),
                "support_state": support_state,
                "owner_creatable": owner_creatable,
                "schema_version": str(entry["schemaVersion"]),
                "version": entry.get("version"),
            }
        )
    return {
        "schema_version": _TEMPLATE_KIT_CONTRACT["schemaVersion"],
        "studio_room_schema_version": _TEMPLATE_KIT_CONTRACT["studioRoomSchemaVersion"],
        "primary_ids": owner_creatable_template_kit_ids(),
        "candidate_ids": [kit["id"] for kit in kits if kit["support_state"] == "candidate"],
        "deferred_ids": [kit["id"] for kit in kits if kit["support_state"] == "deferred"],
        "non_owner_creatable_ids": sorted(CANDIDATE_TEMPLATE_KITS),
        "kits": kits,
    }


def create_template_kit_studio_room_draft(
    data: dict[str, Any],
    *,
    actor: User,
) -> tuple[PresenceNode, PresenceEditableConfig, dict[str, Any]]:
    media_asset_records_available()
    kit_id = _extract_kit_id(data)
    kit = _require_primary_kit(kit_id)
    draft_payload = _extract_draft_payload(data)
    payload = _validate_draft_payload(draft_payload, kit_id=kit_id)
    room = payload["room"]
    summary = _room_summary(room)

    node = create_presence_node(_node_payload_for_kit(kit_id, kit, payload), actor=actor)
    _force_private_draft(node, actor)
    draft, _created = update_draft_config(node, actor, _editor_payload_for_kit(kit_id, kit, payload, summary))

    response = {
        "node_id": node.id,
        "room_id": node.id,
        "slug": node.slug,
        "template_kit_id": kit_id,
        "template_kit_name": kit["name"],
        "support_state": "primary",
        "status": node.status,
        "visibility": node.visibility,
        "public_status": node.public_status,
        "published": None,
        "published_at": None,
        "base_published_version": 0,
        "draft": {
            "id": draft.id,
            "version": draft.version,
            "status": draft.status,
            "schema_version": getattr(draft, "schema_version", None),
        },
        "contract": TEMPLATE_KIT_DRAFT_CONTRACT_VERSION,
        "schema_version": payload["schemaVersion"],
        "chamber_count": summary["chamber_count"],
        "object_count": summary["object_count"],
        "mobile_variant_count": summary["mobile_variant_count"],
        "editor_path": f"/studio/{node.id}/studio-room",
    }
    return node, draft, response


def update_template_kit_studio_room_draft(
    room: PresenceNode,
    data: dict[str, Any],
    *,
    actor: User,
) -> tuple[PresenceEditableConfig, dict[str, Any]]:
    media_asset_records_available()
    draft = draft_config_for_room(room)
    if not draft:
        raise TemplateKitDraftPersistenceError(
            "Studio Room draft config was not found.",
            status=404,
            code="studio_room_draft_not_found",
        )
    existing = _stored_studio_room_draft(draft)
    if not existing:
        raise TemplateKitDraftPersistenceError(
            "This Presence does not contain a TemplateKit Studio Room draft.",
            status=404,
            code="studio_room_draft_not_found",
        )

    incoming = _extract_studio_room_draft_update(data)
    kit_id = str(existing.get("template_kit_id") or "").strip()
    if not kit_id:
        raise TemplateKitDraftPersistenceError("Stored Studio Room draft is missing its TemplateKit id.")
    _require_primary_kit(kit_id)
    updated = _validate_persisted_studio_room_draft(incoming, existing=existing, kit_id=kit_id)
    _assert_allowed_studio_room_draft_changes(existing, updated)
    summary = _room_summary(updated["room"])

    saved, _created = update_draft_config(
        room,
        actor,
        {
            "scene_config": {"summary": summary},
            "content_config": {"studio_room_draft": updated},
        },
        partial=True,
    )
    _force_private_draft(room, actor)
    published = published_config_for_room(room)
    return saved, {
        "room_id": room.id,
        "slug": room.slug,
        "template_kit_id": kit_id,
        "status": room.status,
        "visibility": room.visibility,
        "public_status": room.public_status,
        "published": None,
        "published_config_present": bool(published),
        "published_at": room.published_at.isoformat() if room.published_at else None,
        "base_published_version": updated.get("base_published_version") or 0,
        "contract": TEMPLATE_KIT_DRAFT_CONTRACT_VERSION,
        "draft": {
            "id": saved.id,
            "version": saved.version,
            "status": saved.status,
            "updated_at": saved.updated_at.isoformat() if saved.updated_at else None,
        },
        "studio_room_draft": updated,
        "chamber_count": summary["chamber_count"],
        "object_count": summary["object_count"],
        "mobile_variant_count": summary["mobile_variant_count"],
    }


def _extract_kit_id(data: dict[str, Any]) -> str:
    if not isinstance(data, dict):
        raise TemplateKitDraftPersistenceError("JSON object payload is required.")
    kit_id = str(data.get("kit_id") or data.get("kitId") or data.get("template_kit_id") or data.get("templateKitId") or "").strip()
    if not kit_id:
        raise TemplateKitDraftPersistenceError("kit_id is required.", details={"field": "kit_id"})
    return kit_id


def _require_primary_kit(kit_id: str) -> dict[str, str]:
    if kit_id in CANDIDATE_TEMPLATE_KITS:
        raise TemplateKitDraftPersistenceError(
            "This TemplateKit is not available for owner draft creation.",
            status=403,
            code="template_kit_not_owner_creatable",
            details={"kit_id": kit_id},
        )
    kit = PRIMARY_TEMPLATE_KITS.get(kit_id)
    if not kit:
        raise TemplateKitDraftPersistenceError(
            "TemplateKit was not found.",
            status=404,
            code="template_kit_not_found",
            details={"kit_id": kit_id},
        )
    return kit


def _extract_draft_payload(data: dict[str, Any]) -> dict[str, Any]:
    payload = data.get("draft_payload") or data.get("draftPayload") or data.get("saveable_payload") or data.get("saveablePayload")
    if not isinstance(payload, dict):
        raise TemplateKitDraftPersistenceError("draft_payload is required.", details={"field": "draft_payload"})
    return payload


def _extract_studio_room_draft_update(data: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise TemplateKitDraftPersistenceError("JSON object payload is required.")
    payload = data.get("studio_room_draft") or data.get("studioRoomDraft")
    if not isinstance(payload, dict):
        raise TemplateKitDraftPersistenceError("studio_room_draft is required.", details={"field": "studio_room_draft"})
    return payload


def _stored_studio_room_draft(config: PresenceEditableConfig) -> dict[str, Any] | None:
    content = config.content_config_json if isinstance(config.content_config_json, dict) else {}
    value = content.get("studio_room_draft")
    return deepcopy(value) if isinstance(value, dict) else None


def _validate_draft_payload(payload: dict[str, Any], *, kit_id: str) -> dict[str, Any]:
    _assert_no_restricted_keys(payload)
    schema_version = str(payload.get("schemaVersion") or payload.get("schema_version") or "").strip()
    if schema_version != PRESENCE_STUDIO_ROOM_SCHEMA_VERSION:
        raise TemplateKitDraftPersistenceError("Unsupported Studio Room schema version.", details={"schema_version": schema_version})
    payload_kit_id = str(payload.get("templateKitId") or payload.get("template_kit_id") or "").strip()
    if payload_kit_id != kit_id:
        raise TemplateKitDraftPersistenceError("TemplateKit payload mismatch.", details={"kit_id": kit_id})

    room = payload.get("room")
    if not isinstance(room, dict):
        raise TemplateKitDraftPersistenceError("draft_payload.room is required.", details={"field": "room"})
    _assert_no_restricted_keys(room)
    if str(room.get("schemaVersion") or room.get("schema_version") or "").strip() != PRESENCE_STUDIO_ROOM_SCHEMA_VERSION:
        raise TemplateKitDraftPersistenceError("Room schema version mismatch.", details={"field": "room.schemaVersion"})
    if str(room.get("templateKitId") or room.get("template_kit_id") or "").strip() != kit_id:
        raise TemplateKitDraftPersistenceError("Room TemplateKit mismatch.", details={"field": "room.templateKitId"})
    if str(room.get("state") or "").strip() != "draft":
        raise TemplateKitDraftPersistenceError("TemplateKit-created Studio Rooms must be draft state.", details={"field": "room.state"})
    chambers = room.get("chambers")
    if not isinstance(chambers, list) or not chambers:
        raise TemplateKitDraftPersistenceError("TemplateKit-created Studio Rooms require chambers.", details={"field": "room.chambers"})

    copy_scaffolds = payload.get("copyScaffolds") or payload.get("copy_scaffolds") or []
    cta_strategy = payload.get("ctaStrategy") or payload.get("cta_strategy") or {}
    if not isinstance(copy_scaffolds, list) or not copy_scaffolds:
        raise TemplateKitDraftPersistenceError("copyScaffolds are required.", details={"field": "copyScaffolds"})
    if not isinstance(cta_strategy, dict) or not cta_strategy.get("label"):
        raise TemplateKitDraftPersistenceError("ctaStrategy is required.", details={"field": "ctaStrategy"})

    stored_room = deepcopy(room)
    stored_room["id"] = _safe_room_identifier(stored_room.get("id"), kit_id)

    return {
        "schemaVersion": schema_version,
        "templateKitId": kit_id,
        "room": stored_room,
        "requiredFields": _string_list(payload.get("requiredFields") or payload.get("required_fields")),
        "optionalFields": _string_list(payload.get("optionalFields") or payload.get("optional_fields")),
        "copyScaffolds": deepcopy(copy_scaffolds),
        "ctaStrategy": deepcopy(cta_strategy),
        "sourcePersistenceBoundary": str(payload.get("persistenceBoundary") or payload.get("persistence_boundary") or "").strip() or None,
    }


def _validate_persisted_studio_room_draft(
    payload: dict[str, Any],
    *,
    existing: dict[str, Any],
    kit_id: str,
) -> dict[str, Any]:
    _assert_no_restricted_keys(payload, path="studio_room_draft")
    contract = str(payload.get("contract") or "").strip()
    if contract != TEMPLATE_KIT_DRAFT_CONTRACT_VERSION:
        raise TemplateKitDraftPersistenceError("Unsupported Studio Room draft contract.", details={"contract": contract})
    schema_version = str(payload.get("schema_version") or payload.get("schemaVersion") or "").strip()
    if schema_version != PRESENCE_STUDIO_ROOM_SCHEMA_VERSION:
        raise TemplateKitDraftPersistenceError("Unsupported Studio Room schema version.", details={"schema_version": schema_version})
    incoming_kit_id = str(payload.get("template_kit_id") or payload.get("templateKitId") or "").strip()
    if incoming_kit_id != kit_id:
        raise TemplateKitDraftPersistenceError("TemplateKit payload mismatch.", details={"kit_id": incoming_kit_id})
    if str(payload.get("support_state") or payload.get("supportState") or "").strip() != "primary":
        raise TemplateKitDraftPersistenceError("Only primary TemplateKit drafts can be edited.", details={"field": "support_state"})
    if payload.get("published_state") is not None or payload.get("publishedState") is not None:
        raise TemplateKitDraftPersistenceError("Studio Room draft updates cannot include published state.", details={"field": "published_state"})

    room = payload.get("room")
    if not isinstance(room, dict):
        raise TemplateKitDraftPersistenceError("studio_room_draft.room is required.", details={"field": "room"})
    _assert_no_restricted_keys(room, path="studio_room_draft.room")
    if str(room.get("schemaVersion") or room.get("schema_version") or "").strip() != PRESENCE_STUDIO_ROOM_SCHEMA_VERSION:
        raise TemplateKitDraftPersistenceError("Room schema version mismatch.", details={"field": "room.schemaVersion"})
    if str(room.get("templateKitId") or room.get("template_kit_id") or "").strip() != kit_id:
        raise TemplateKitDraftPersistenceError("Room TemplateKit mismatch.", details={"field": "room.templateKitId"})
    if str(room.get("state") or "").strip() != "draft":
        raise TemplateKitDraftPersistenceError("Studio Room draft updates must keep room.state as draft.", details={"field": "room.state"})
    chambers = room.get("chambers")
    if not isinstance(chambers, list) or not chambers:
        raise TemplateKitDraftPersistenceError("Studio Room draft updates require chambers.", details={"field": "room.chambers"})

    cta_strategy = payload.get("cta_strategy") or payload.get("ctaStrategy") or existing.get("cta_strategy") or {}
    if not isinstance(cta_strategy, dict):
        raise TemplateKitDraftPersistenceError("cta_strategy must be an object.", details={"field": "cta_strategy"})
    if "target" in cta_strategy and cta_strategy.get("target") not in _CTA_TARGETS:
        raise TemplateKitDraftPersistenceError("CTA target is not supported.", details={"field": "cta_strategy.target"})
    primary_chamber_id = cta_strategy.get("primaryChamberId") or cta_strategy.get("primary_chamber_id")
    if primary_chamber_id and not _chamber_exists(room, str(primary_chamber_id)):
        raise TemplateKitDraftPersistenceError("CTA target chamber was not found.", details={"field": "cta_strategy.primaryChamberId"})

    normalized = {
        "contract": contract,
        "schema_version": schema_version,
        "template_kit_id": kit_id,
        "template_kit_name": str(payload.get("template_kit_name") or existing.get("template_kit_name") or "").strip(),
        "support_state": "primary",
        "base_published_version": int(payload.get("base_published_version") or existing.get("base_published_version") or 0),
        "published_state": None,
        "room": deepcopy(room),
        "required_fields": _string_list(payload.get("required_fields") or existing.get("required_fields")),
        "optional_fields": _string_list(payload.get("optional_fields") or existing.get("optional_fields")),
        "copy_scaffolds": deepcopy(payload.get("copy_scaffolds") or existing.get("copy_scaffolds") or []),
        "cta_strategy": deepcopy(cta_strategy),
        "source_persistence_boundary": str(payload.get("source_persistence_boundary") or existing.get("source_persistence_boundary") or "").strip() or None,
    }
    if not normalized["copy_scaffolds"]:
        raise TemplateKitDraftPersistenceError("copy_scaffolds are required.", details={"field": "copy_scaffolds"})
    return normalized


def _assert_no_restricted_keys(value: Any, *, path: str = "draft_payload") -> None:
    if isinstance(value, list):
        for index, item in enumerate(value):
            _assert_no_restricted_keys(item, path=f"{path}[{index}]")
        return
    if not isinstance(value, dict):
        return
    for key, child in value.items():
        compact = "".join(ch for ch in str(key).lower() if ch.isalnum())
        if compact in _RESTRICTED_COMPACT_KEYS:
            raise TemplateKitDraftPersistenceError(
                "TemplateKit draft payload contains a restricted field.",
                details={"field": f"{path}.{key}"},
            )
        _assert_no_restricted_keys(child, path=f"{path}.{key}")


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item or "").strip()]


def _safe_room_identifier(value: Any, kit_id: str) -> str:
    text = str(value or "").strip()
    if not text:
        return f"starter-{kit_id}"
    safe = "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in text)
    safe = "-".join(part for part in safe.split("-") if part)
    return safe[:120] or f"starter-{kit_id}"


def _assert_allowed_studio_room_draft_changes(existing: dict[str, Any], updated: dict[str, Any]) -> None:
    for key in (
        "contract",
        "schema_version",
        "template_kit_id",
        "template_kit_name",
        "support_state",
        "base_published_version",
        "published_state",
        "required_fields",
        "optional_fields",
        "copy_scaffolds",
        "source_persistence_boundary",
    ):
        if existing.get(key) != updated.get(key):
            raise TemplateKitDraftPersistenceError(
                "Studio Room draft update attempted to change a locked field.",
                details={"field": key},
            )
    _assert_allowed_cta_strategy_changes(existing.get("cta_strategy") or {}, updated.get("cta_strategy") or {}, updated["room"])
    _assert_allowed_room_changes(existing.get("room") or {}, updated.get("room") or {})


def _assert_allowed_cta_strategy_changes(existing: dict[str, Any], updated: dict[str, Any], room: dict[str, Any]) -> None:
    allowed = {"label", "primaryChamberId", "primary_chamber_id"}
    for key in set(existing) | set(updated):
        if existing.get(key) == updated.get(key):
            continue
        if key not in allowed:
            raise TemplateKitDraftPersistenceError(
                "Studio Room draft update attempted to change a locked CTA strategy field.",
                details={"field": f"cta_strategy.{key}"},
            )
        if key in {"primaryChamberId", "primary_chamber_id"} and not _chamber_exists(room, str(updated.get(key) or "")):
            raise TemplateKitDraftPersistenceError("CTA target chamber was not found.", details={"field": f"cta_strategy.{key}"})


def _assert_allowed_room_changes(existing: dict[str, Any], updated: dict[str, Any]) -> None:
    locked_room_keys = set(existing) | set(updated)
    locked_room_keys.discard("chambers")
    for key in locked_room_keys:
        if existing.get(key) != updated.get(key):
            raise TemplateKitDraftPersistenceError(
                "Studio Room draft update attempted to change a locked room field.",
                details={"field": f"room.{key}"},
            )

    old_chambers = existing.get("chambers") if isinstance(existing.get("chambers"), list) else []
    new_chambers = updated.get("chambers") if isinstance(updated.get("chambers"), list) else []
    if len(old_chambers) != len(new_chambers):
        raise TemplateKitDraftPersistenceError("Chambers cannot be added or removed in this editor pass.", details={"field": "room.chambers"})
    for index, (old_chamber, new_chamber) in enumerate(zip(old_chambers, new_chambers)):
        if not isinstance(old_chamber, dict) or not isinstance(new_chamber, dict):
            raise TemplateKitDraftPersistenceError("Invalid chamber payload.", details={"field": f"room.chambers[{index}]"})
        _assert_allowed_chamber_changes(old_chamber, new_chamber, index=index)


def _assert_allowed_chamber_changes(existing: dict[str, Any], updated: dict[str, Any], *, index: int) -> None:
    allowed_chamber_keys = {"title", "summary"}
    for key in set(existing) | set(updated):
        if key == "objects":
            continue
        if existing.get(key) == updated.get(key):
            continue
        if key not in allowed_chamber_keys:
            raise TemplateKitDraftPersistenceError(
                "Studio Room draft update attempted to change a locked chamber field.",
                details={"field": f"room.chambers[{index}].{key}"},
            )
    old_objects = existing.get("objects") if isinstance(existing.get("objects"), list) else []
    new_objects = updated.get("objects") if isinstance(updated.get("objects"), list) else []
    if len(old_objects) != len(new_objects):
        raise TemplateKitDraftPersistenceError(
            "Objects cannot be added or removed in this editor pass.",
            details={"field": f"room.chambers[{index}].objects"},
        )
    for object_index, (old_object, new_object) in enumerate(zip(old_objects, new_objects)):
        if not isinstance(old_object, dict) or not isinstance(new_object, dict):
            raise TemplateKitDraftPersistenceError(
                "Invalid object payload.",
                details={"field": f"room.chambers[{index}].objects[{object_index}]"},
            )
        _assert_allowed_object_changes(old_object, new_object, chamber_index=index, object_index=object_index)


def _assert_allowed_object_changes(
    existing: dict[str, Any],
    updated: dict[str, Any],
    *,
    chamber_index: int,
    object_index: int,
) -> None:
    object_type = str(existing.get("type") or "").strip()
    if updated.get("type") != existing.get("type"):
        raise TemplateKitDraftPersistenceError(
            "Object type cannot be changed in this editor pass.",
            details={"field": _object_path(chamber_index, object_index, "type")},
        )
    if object_type not in _EDITABLE_CONTENT_KEYS_BY_TYPE:
        raise TemplateKitDraftPersistenceError(
            "This object type is not editable in this editor pass.",
            details={"field": _object_path(chamber_index, object_index, "type")},
        )

    for key in set(existing) | set(updated):
        if key == "content":
            continue
        if existing.get(key) == updated.get(key):
            continue
        if key == "label" and object_type in _EDITABLE_OBJECT_LABEL_TYPES:
            continue
        raise TemplateKitDraftPersistenceError(
            "Studio Room draft update attempted to change a locked object field.",
            details={"field": _object_path(chamber_index, object_index, key)},
        )
    _assert_allowed_content_changes(
        existing.get("content") if isinstance(existing.get("content"), dict) else {},
        updated.get("content") if isinstance(updated.get("content"), dict) else {},
        object_type=object_type,
        chamber_index=chamber_index,
        object_index=object_index,
    )


def _assert_allowed_content_changes(
    existing: dict[str, Any],
    updated: dict[str, Any],
    *,
    object_type: str,
    chamber_index: int,
    object_index: int,
) -> None:
    allowed = _EDITABLE_CONTENT_KEYS_BY_TYPE.get(object_type, set())
    for key in set(existing) | set(updated):
        if existing.get(key) == updated.get(key):
            continue
        if key not in allowed:
            raise TemplateKitDraftPersistenceError(
                "Studio Room draft update attempted to change a locked content field.",
                details={"field": _object_path(chamber_index, object_index, f"content.{key}")},
            )
        if key == "action":
            _assert_allowed_action_change(
                existing.get("action") if isinstance(existing.get("action"), dict) else {},
                updated.get("action") if isinstance(updated.get("action"), dict) else {},
                object_type=object_type,
                chamber_index=chamber_index,
                object_index=object_index,
            )
        if key in {"url"}:
            _assert_safe_edit_url(str(updated.get(key) or ""), path=_object_path(chamber_index, object_index, f"content.{key}"))


def _assert_allowed_action_change(
    existing: dict[str, Any],
    updated: dict[str, Any],
    *,
    object_type: str,
    chamber_index: int,
    object_index: int,
) -> None:
    if object_type not in _ACTION_EDITABLE_OBJECT_TYPES:
        raise TemplateKitDraftPersistenceError(
            "This object action is not editable in this editor pass.",
            details={"field": _object_path(chamber_index, object_index, "content.action")},
        )
    allowed = {"label", "href"}
    for key in set(existing) | set(updated):
        if existing.get(key) == updated.get(key):
            continue
        if key not in allowed:
            raise TemplateKitDraftPersistenceError(
                "Studio Room draft update attempted to change a locked action field.",
                details={"field": _object_path(chamber_index, object_index, f"content.action.{key}")},
            )
        if key == "href":
            _assert_safe_edit_url(str(updated.get("href") or ""), path=_object_path(chamber_index, object_index, "content.action.href"))


def _assert_safe_edit_url(value: str, *, path: str) -> None:
    text = value.strip()
    if not text:
        return
    if text.startswith("#"):
        fragment = text[1:]
        if not fragment or not all(ch.isalnum() or ch in "-_" for ch in fragment):
            raise TemplateKitDraftPersistenceError("Fragment targets must use a safe chamber id.", details={"field": path})
        return
    if text.startswith("/"):
        lowered = text.lower()
        if ".." in text.split("/") or lowered.startswith(("/studio", "/internal", "/api", "/admin")):
            raise TemplateKitDraftPersistenceError("Relative URLs must point to public-safe paths.", details={"field": path})
        return
    parsed = urlparse(text)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise TemplateKitDraftPersistenceError("Editable links must be public http(s), public relative paths, or safe chamber fragments.", details={"field": path})
    hostname = (parsed.hostname or "").strip().lower()
    if not hostname or hostname in {"localhost", "127.0.0.1", "0.0.0.0", "::1"} or hostname.endswith((".local", ".internal")):
        raise TemplateKitDraftPersistenceError("Editable links must not point at localhost or internal hosts.", details={"field": path})


def _chamber_exists(room: dict[str, Any], chamber_id: str) -> bool:
    chambers = room.get("chambers") if isinstance(room.get("chambers"), list) else []
    return any(isinstance(chamber, dict) and chamber.get("id") == chamber_id for chamber in chambers)


def _object_path(chamber_index: int, object_index: int, field: str) -> str:
    return f"room.chambers[{chamber_index}].objects[{object_index}].{field}"


def _node_payload_for_kit(kit_id: str, kit: dict[str, str], payload: dict[str, Any]) -> dict[str, Any]:
    cta = payload.get("ctaStrategy") if isinstance(payload.get("ctaStrategy"), dict) else {}
    return {
        "display_name": f"Untitled {kit['name']}",
        "slug": f"studio-{kit_id}-draft",
        "headline": f"Draft Studio Room from {kit['name']}",
        "bio": "Replace this scaffold copy before publishing.",
        "node_type": kit["node_type"],
        "display_mode": kit["display_mode"],
        "room_type": kit["room_type"],
        "theme_preset": kit["theme_preset"],
        "plan_type": "basic",
        "status": "draft",
        "visibility": "private",
        "public_status": "draft",
        "primary_cta_label": str(cta.get("label") or "").strip() or None,
        "landing_enabled": False,
        "metadata": {
            "studio_room_template": {
                "kit_id": kit_id,
                "kit_name": kit["name"],
                "support_state": "primary",
                "schema_version": payload["schemaVersion"],
                "contract": TEMPLATE_KIT_DRAFT_CONTRACT_VERSION,
                "created_via": "template-kit-start",
            }
        },
    }


def _force_private_draft(node: PresenceNode, actor: User) -> None:
    node.status = "draft"
    node.visibility = "private"
    node.public_status = "draft"
    node.published_at = None
    if getattr(actor, "role", None) != "platform_admin":
        node.owner_user_id = actor.id
    if not node.tenant_id:
        node.tenant_id = getattr(actor, "node_id", None)


def _editor_payload_for_kit(
    kit_id: str,
    kit: dict[str, str],
    payload: dict[str, Any],
    summary: dict[str, int],
) -> dict[str, Any]:
    room = payload["room"]
    return {
        "renderer_key": TEMPLATE_KIT_RENDERER_KEY,
        "scene_config": {
            "studio_room_contract": TEMPLATE_KIT_DRAFT_CONTRACT_VERSION,
            "schema_version": payload["schemaVersion"],
            "template_kit_id": kit_id,
            "entry_chamber_id": room.get("entryChamberId") or room.get("entry_chamber_id"),
            "summary": summary,
        },
        "style_dna": {},
        "motion_config": {},
        "asset_config": {},
        "content_config": {
            "studio_room_draft": {
                "contract": TEMPLATE_KIT_DRAFT_CONTRACT_VERSION,
                "schema_version": payload["schemaVersion"],
                "template_kit_id": kit_id,
                "template_kit_name": kit["name"],
                "support_state": "primary",
                "base_published_version": 0,
                "published_state": None,
                "room": room,
                "required_fields": payload["requiredFields"],
                "optional_fields": payload["optionalFields"],
                "copy_scaffolds": payload["copyScaffolds"],
                "cta_strategy": payload["ctaStrategy"],
                "source_persistence_boundary": payload["sourcePersistenceBoundary"],
            },
            "template_kit": {
                "id": kit_id,
                "name": kit["name"],
                "description": kit["description"],
                "support_state": "primary",
            },
        },
        "roomkey_config": {
            "created_via": "template-kit-start",
            "public_route_behavior": "unchanged",
        },
        "enquiry_config": {
            "cta_label": payload["ctaStrategy"].get("label"),
            "delivery_posture": "owner_config_required_before_publish",
        },
        "locked_fields": {
            "studio_room_persistence_contract": {
                "contract": TEMPLATE_KIT_DRAFT_CONTRACT_VERSION,
                "schema_version": payload["schemaVersion"],
                "base_published_version": 0,
                "candidate_kits_excluded": True,
            }
        },
    }


def _room_summary(room: dict[str, Any]) -> dict[str, int]:
    chambers = room.get("chambers") if isinstance(room.get("chambers"), list) else []
    object_count = 0
    mobile_variant_count = 1 if room.get("mobile") else 0
    for chamber in chambers:
        if not isinstance(chamber, dict):
            continue
        if chamber.get("mobile"):
            mobile_variant_count += 1
        objects = chamber.get("objects") if isinstance(chamber.get("objects"), list) else []
        object_count += len(objects)
        mobile_variant_count += sum(1 for item in objects if isinstance(item, dict) and item.get("mobile"))
    return {
        "chamber_count": len(chambers),
        "object_count": object_count,
        "mobile_variant_count": mobile_variant_count,
    }
