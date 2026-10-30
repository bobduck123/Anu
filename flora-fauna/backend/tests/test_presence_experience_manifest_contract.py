"""Pure contract tests: no database, publish action or scene execution."""

import json
from copy import deepcopy
from pathlib import Path

import pytest
from marshmallow import ValidationError

from app.services.presence_experience_manifest import (
    canonical_manifest_digest,
    validate_experience_manifest,
)


FIXTURE = Path(__file__).resolve().parents[3] / "docs" / "presence-v5" / "fixtures" / "sydney-rail-manifest-v1.json"


def manifest():
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def rehash(value):
    value["publication"]["content_sha256"] = canonical_manifest_digest(value)
    return value


def test_sydney_rail_fixture_is_a_valid_published_contract():
    value = manifest()
    result = validate_experience_manifest(value)
    assert result["schema_version"] == "presence-experience-manifest-v1"
    assert result["publication"]["config_version"] == 1
    assert [binding["kind"] for binding in result["bindings"]] == [
        "falak.transport.network",
        "falak.transport.line_patterns",
        "falak.transport.station_discovery",
    ]
    assert all(binding["mode"] == "snapshot" for binding in result["bindings"])


@pytest.mark.parametrize("change", [
    lambda value: value.update({"unreviewed_private_payload": {"token": "secret"}}),
    lambda value: value["scene"].update({"module_id": "../arbitrary-script"}),
    lambda value: value["assets"][0].update({"uri": "http://assets.example.test/fallback.png"}),
    lambda value: value["navigation"]["transitions"][0].update({"to_scene": "unregistered"}),
    lambda value: value["fallbacks"].update({"static_asset_id": "missing"}),
    lambda value: value["scene"]["runtime"].update({"max_version_exclusive": "1.0.0"}),
    lambda value: value["bindings"][1].update({"selection_key": "selected_station_id"}),
    lambda value: value["bindings"].append(deepcopy(value["bindings"][0])),
    lambda value: value["bindings"][1].update({"falak_tenant_id": "00000000-0000-4000-8000-000000000002"}),
    lambda value: value["publication"].update({"published_at": "2026-10-30T00:00:00"}),
])
def test_rejects_invalid_or_unsafe_manifest_shapes(change):
    value = manifest()
    change(value)
    with pytest.raises(ValidationError):
        validate_experience_manifest(rehash(value))


def test_digest_detects_mutation_after_validation():
    value = manifest()
    value["navigation"]["scenes"][0]["label"] = "Changed after publication"
    with pytest.raises(ValidationError, match="digest"):
        validate_experience_manifest(value)


def test_live_binding_requires_approval_reference_but_schema_does_not_authorise_it():
    value = manifest()
    value["bindings"][2]["mode"] = "approved_live"
    with pytest.raises(ValidationError, match="approval_ref"):
        validate_experience_manifest(rehash(value))
    value["bindings"][2]["approval_ref"] = "fixture-only-not-an-authorisation"
    assert validate_experience_manifest(rehash(value))["bindings"][2]["mode"] == "approved_live"


def test_scene_parameters_require_a_trusted_module_validator():
    value = manifest()
    value["scene"]["parameters"] = {"camera_height": 8}
    rehash(value)
    with pytest.raises(ValidationError, match="trusted module"):
        validate_experience_manifest(value)
    seen = []
    validate_experience_manifest(value, parameter_validator=lambda schema_id, params: seen.append((schema_id, params)))
    assert seen == [("sydney_rail_v1", {"camera_height": 8})]


def test_manifest_does_not_accept_domain_actions_as_generic_interactions():
    value = manifest()
    value["interactions"].append({"event": "smac.vote.cast", "state_scope": "session"})
    with pytest.raises(ValidationError):
        validate_experience_manifest(rehash(value))
