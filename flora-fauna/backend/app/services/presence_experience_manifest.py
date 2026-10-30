"""Versioned Presence experience contract. No storage, route or executable module loading."""

from __future__ import annotations

import hashlib
import json
import re
from copy import deepcopy
from typing import Callable
from urllib.parse import urlsplit

from marshmallow import RAISE, Schema, ValidationError, fields, validate, validates_schema


SCHEMA_VERSION = "presence-experience-manifest-v1"
MODULE_ID = validate.Regexp(r"^(?=.{3,120}$)[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$")
SEMVER = validate.Regexp(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")
SHA256 = validate.Regexp(r"^[0-9a-f]{64}$")
KEY = validate.Regexp(r"^[a-z][a-z0-9_-]{0,79}$")
INTERACTIONS = (
    "rail.line.selected", "rail.station.selected", "discovery.event.opened",
    "presence.entity.entered", "presence.entity.exited",
    "experience.selection.changed", "experience.state.saved",
)
BINDING_KINDS = (
    "falak.transport.network", "falak.transport.line_patterns",
    "falak.transport.station_discovery", "falak.canonical.entity",
)


class StrictSchema(Schema):
    class Meta:
        unknown = RAISE


class ExperienceSchema(StrictSchema):
    room_id = fields.Integer(required=True, strict=True, validate=validate.Range(min=1))
    slug = fields.String(required=True, validate=validate.Regexp(r"^[a-z0-9][a-z0-9-]{1,179}$"))
    owner_tenant_id = fields.Integer(required=True, strict=True, validate=validate.Range(min=1))
    experience_type = fields.String(required=True, validate=validate.OneOf(["spatial", "gallery", "festival"]))


class PublicationSchema(StrictSchema):
    status = fields.String(required=True, validate=validate.Equal("published"))
    config_version = fields.Integer(required=True, strict=True, validate=validate.Range(min=1))
    published_at = fields.DateTime(required=True, format="iso")
    content_sha256 = fields.String(required=True, validate=SHA256)

    @validates_schema
    def offset_required(self, data, **kwargs):
        published_at = data.get("published_at")
        if published_at and published_at.utcoffset() is None:
            raise ValidationError("published_at requires a timezone offset")


class RuntimeSchema(StrictSchema):
    min_version = fields.String(required=True, validate=SEMVER)
    max_version_exclusive = fields.String(required=True, validate=SEMVER)

    @validates_schema
    def ordered_versions(self, data, **kwargs):
        if "min_version" in data and "max_version_exclusive" in data:
            left = tuple(map(int, data["min_version"].split(".")))
            right = tuple(map(int, data["max_version_exclusive"].split(".")))
            if left >= right:
                raise ValidationError("Runtime version range must be increasing")


class SceneSchema(StrictSchema):
    module_id = fields.String(required=True, validate=MODULE_ID)
    module_version = fields.String(required=True, validate=SEMVER)
    runtime = fields.Nested(RuntimeSchema, required=True)
    parameter_schema_id = fields.String(required=True, validate=KEY)
    parameters = fields.Dict(required=True)


class AssetSchema(StrictSchema):
    id = fields.String(required=True, validate=KEY)
    version = fields.String(required=True, validate=SEMVER)
    uri = fields.String(required=True)
    media_type = fields.String(required=True, validate=validate.Length(min=3, max=120))
    byte_size = fields.Integer(required=True, strict=True, validate=validate.Range(min=1))
    sha256 = fields.String(required=True, validate=SHA256)
    role = fields.String(required=True, validate=validate.OneOf(
        ["geometry", "texture", "audio", "video", "poster", "fallback"]
    ))

    @validates_schema
    def safe_uri(self, data, **kwargs):
        uri = data.get("uri", "")
        parsed = urlsplit(uri)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
            raise ValidationError("Asset URI must be an HTTPS URL without userinfo", field_name="uri")


class BindingSchema(StrictSchema):
    id = fields.String(required=True, validate=KEY)
    kind = fields.String(required=True, validate=validate.OneOf(BINDING_KINDS))
    falak_tenant_id = fields.UUID(required=True)
    mode = fields.String(required=True, validate=validate.OneOf(["snapshot", "approved_live"]))
    target_node_id = fields.UUID(load_default=None, allow_none=True)
    selection_key = fields.String(load_default=None, allow_none=True,
                                  validate=validate.OneOf(["selected_line_id", "selected_station_id"]))
    approval_ref = fields.String(load_default=None, allow_none=True,
                                 validate=validate.Length(min=1, max=120))
    cache_ttl_seconds = fields.Integer(required=True, strict=True, validate=validate.Range(min=0, max=300))

    @validates_schema
    def binding_shape(self, data, **kwargs):
        kind = data.get("kind")
        target = data.get("target_node_id")
        selection = data.get("selection_key")
        expected_selection = {
            "falak.transport.line_patterns": "selected_line_id",
            "falak.transport.station_discovery": "selected_station_id",
        }
        if kind in ("falak.transport.network", "falak.canonical.entity"):
            if not target or selection:
                raise ValidationError("This binding requires a fixed canonical node ID")
        elif kind in expected_selection:
            if target or selection != expected_selection[kind]:
                raise ValidationError("This binding requires the matching session selection key")
        if data.get("mode") == "approved_live" and not data.get("approval_ref"):
            raise ValidationError("Approved live binding requires approval_ref")
        if data.get("mode") == "snapshot" and data.get("approval_ref"):
            raise ValidationError("Snapshot binding cannot carry approval_ref")


class NavigationSceneSchema(StrictSchema):
    id = fields.String(required=True, validate=KEY)
    label = fields.String(required=True, validate=validate.Length(min=1, max=120))


class TransitionSchema(StrictSchema):
    from_scene = fields.String(required=True, validate=KEY)
    to_scene = fields.String(required=True, validate=KEY)
    on = fields.String(required=True, validate=validate.OneOf(INTERACTIONS))


class NavigationSchema(StrictSchema):
    initial_scene = fields.String(required=True, validate=KEY)
    scenes = fields.List(fields.Nested(NavigationSceneSchema), required=True, validate=validate.Length(min=1, max=30))
    transitions = fields.List(fields.Nested(TransitionSchema), required=True)


class InteractionSchema(StrictSchema):
    event = fields.String(required=True, validate=validate.OneOf(INTERACTIONS))
    state_scope = fields.String(required=True, validate=validate.OneOf(
        ["transient", "session", "persistent_preference"]
    ))


class InitialStateSchema(StrictSchema):
    scene_id = fields.String(required=True, validate=KEY)
    selected_line_id = fields.UUID(required=True, allow_none=True)
    selected_station_id = fields.UUID(required=True, allow_none=True)


class PerformanceSchema(StrictSchema):
    target_fps = fields.Integer(required=True, strict=True, validate=validate.Range(min=24, max=120))
    max_texture_mb = fields.Integer(required=True, strict=True, validate=validate.Range(min=1, max=1024))
    max_draw_calls = fields.Integer(required=True, strict=True, validate=validate.Range(min=1, max=10000))


class FallbackSchema(StrictSchema):
    reduced_motion = fields.String(required=True, validate=validate.OneOf(["minimal", "static"]))
    no_webgl = fields.String(required=True, validate=validate.OneOf(["static_asset"]))
    static_asset_id = fields.String(required=True, validate=KEY)


class ExperienceManifestSchema(StrictSchema):
    schema_version = fields.String(required=True, validate=validate.Equal(SCHEMA_VERSION))
    experience = fields.Nested(ExperienceSchema, required=True)
    publication = fields.Nested(PublicationSchema, required=True)
    scene = fields.Nested(SceneSchema, required=True)
    assets = fields.List(fields.Nested(AssetSchema), required=True)
    bindings = fields.List(fields.Nested(BindingSchema), required=True)
    navigation = fields.Nested(NavigationSchema, required=True)
    interactions = fields.List(fields.Nested(InteractionSchema), required=True)
    initial_state = fields.Nested(InitialStateSchema, required=True)
    performance = fields.Nested(PerformanceSchema, required=True)
    fallbacks = fields.Nested(FallbackSchema, required=True)

    @validates_schema
    def references_and_uniqueness(self, data, **kwargs):
        def unique(rows, key):
            values = [row[key] for row in rows]
            return len(values) == len(set(values))

        for section, key in (("assets", "id"), ("bindings", "id"),
                             ("interactions", "event")):
            if section in data and not unique(data[section], key):
                raise ValidationError(f"Duplicate {section} {key}")
        binding_tenants = {binding["falak_tenant_id"] for binding in data.get("bindings", [])}
        if len(binding_tenants) > 1:
            raise ValidationError("Manifest v1 bindings must use one Falak tenant")
        navigation = data.get("navigation")
        if not navigation:
            return
        scenes = navigation["scenes"]
        if not unique(scenes, "id"):
            raise ValidationError("Duplicate navigation scene ID")
        scene_ids = {scene["id"] for scene in scenes}
        if navigation["initial_scene"] not in scene_ids:
            raise ValidationError("Initial scene is not registered")
        if data.get("initial_state", {}).get("scene_id") != navigation["initial_scene"]:
            raise ValidationError("Initial state must use the initial scene")
        declared_events = {item["event"] for item in data.get("interactions", [])}
        for transition in navigation["transitions"]:
            if transition["from_scene"] not in scene_ids or transition["to_scene"] not in scene_ids:
                raise ValidationError("Transition references an unknown scene")
            if transition["on"] not in declared_events:
                raise ValidationError("Transition event is not declared")
        fallback_id = data.get("fallbacks", {}).get("static_asset_id")
        assets = {asset["id"]: asset for asset in data.get("assets", [])}
        if fallback_id not in assets or assets[fallback_id]["role"] != "fallback":
            raise ValidationError("Static fallback must reference a fallback asset")


def canonical_manifest_digest(payload: dict) -> str:
    """Hash UTF-8 canonical JSON excluding publication.content_sha256 itself."""
    try:
        value = deepcopy(payload)
        value["publication"].pop("content_sha256", None)
        encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False,
                             allow_nan=False).encode("utf-8")
    except (KeyError, TypeError, ValueError, AttributeError) as exc:
        raise ValidationError("Manifest must be plain JSON with publication metadata") from exc
    return hashlib.sha256(encoded).hexdigest()


def validate_experience_manifest(
    payload: dict, *, parameter_validator: Callable[[str, dict], None] | None = None
) -> dict:
    """Validate structure and digest; registry, approval and origin checks remain publish-time gates."""
    result = ExperienceManifestSchema().load(payload)
    if payload["publication"]["content_sha256"] != canonical_manifest_digest(payload):
        raise ValidationError("Manifest content digest does not match")
    parameters = result["scene"]["parameters"]
    if parameters:
        if parameter_validator is None:
            raise ValidationError("Scene parameters require a trusted module schema validator")
        parameter_validator(result["scene"]["parameter_schema_id"], parameters)
    return result
