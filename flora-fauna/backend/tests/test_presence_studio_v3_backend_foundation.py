import copy
import inspect
import json
import os
from datetime import timedelta

import pytest


os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-studio-v3-foundation"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-studio-v3-foundation"

from flask_jwt_extended import create_access_token  # noqa: E402

from backend_factory import load_create_app  # noqa: E402


def _build_app():
    create_app = load_create_app()
    return create_app(
        {
            "TESTING": True,
            "FLASK_ENV": "testing",
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
            "RATELIMIT_ENABLED": False,
        }
    )


def _headers(app, username):
    with app.app_context():
        token = create_access_token(
            identity=username,
            additional_claims={
                "aud": "public",
                "token_use": "public",
                "role": "participant",
                "username": username,
            },
            expires_delta=timedelta(minutes=30),
        )
    return {"Authorization": f"Bearer {token}"}


def _sections(selected_media_id, marker, *, private_media=True):
    media_reference = (
        {
            "media_id": selected_media_id,
            "visibility": "private_draft",
            "url": f"https://signed.invalid/{selected_media_id}",
            "preview_expires_at": 123,
            "image_url": f"https://ordinary.invalid/{selected_media_id}.webp",
            "alt": "Stable media alt",
        }
        if private_media
        else {
            "objectId": "keep",
            "src": f"/presence-assets/{selected_media_id}.webp",
            "alt": "Published media alt",
        }
    )
    content_object = (
        {"id": "keep", "media_id": selected_media_id, "visibility": "private_draft"}
        if private_media
        else {"id": "keep", "visibility": {"public": True, "mobile": True}}
    )
    return {
        "renderer_key": "presence-studio-v2-room",
        "scene_config_json": {
            "scene_canary": {"keep": True},
            "studio_v2": {"marker": marker, "objectIds": ["keep", "stale"]},
        },
        "style_dna_json": {
            "style_canary": {"keep": True},
            "studio_v2": {"marker": marker, "skin": "nocturnal"},
        },
        "motion_config_json": {
            "motion_canary": {"keep": True},
            "studio_v2": {"marker": marker, "intensity": "gentle"},
        },
        "asset_config_json": {
            "asset_canary": {"keep": True},
            "studio_v2": {"marker": marker, "assets": [media_reference]},
        },
        "content_config_json": {
            "content_canary": {"keep": True},
            "studio_v2": {
                "marker": marker,
                "objects": [
                    content_object,
                    {"id": "stale"},
                ],
            },
        },
        "roomkey_config_json": {
            "roomkey_canary": {"keep": True},
            "studio_v2": {"marker": marker, "portals": []},
        },
        "enquiry_config_json": {
            "enquiry_canary": {"keep": True},
            "studio_v2": {"marker": marker, "primaryCta": {"visible": True}},
        },
        "locked_fields_json": {"server_canary": {"keep": True}},
    }


def _transport_config(selected_media_id, marker="replacement"):
    sections = _sections(selected_media_id, marker)
    config = {
        "renderer_key": sections["renderer_key"],
        "scene_config": sections["scene_config_json"],
        "style_dna": sections["style_dna_json"],
        "motion_config": sections["motion_config_json"],
        "asset_config": sections["asset_config_json"],
        "content_config": sections["content_config_json"],
        "roomkey_config": sections["roomkey_config_json"],
        "enquiry_config": sections["enquiry_config_json"],
        "locked_fields": sections["locked_fields_json"],
    }
    for section in (
        "scene_config",
        "style_dna",
        "motion_config",
        "asset_config",
        "content_config",
        "roomkey_config",
        "enquiry_config",
    ):
        config[section]["studio_v2"].pop("marker", None)
    config["scene_config"]["studio_v2"]["objectIds"] = ["keep", "new"]
    config["scene_config"]["studio_v2"]["chambers"] = [
        {
            "id": "gallery",
            "composition": {
                "layoutId": "gallery-wall",
                "placements": [
                    {
                        "objectId": "keep",
                        "chamberId": "gallery",
                        "layoutId": "gallery-wall",
                        "zoneId": "hero",
                        "order": 0,
                    }
                ],
            },
        }
    ]
    config["content_config"]["studio_v2"]["objects"] = [
        {"id": "keep", "media_id": selected_media_id, "visibility": "private_draft"},
        {"id": "new"},
    ]
    return config


def _media(media_id, room_id, owner_user_id, status, visibility="private_draft"):
    from manara_backend_app.models import PresenceMediaAsset

    return PresenceMediaAsset(
        id=media_id,
        room_id=room_id,
        owner_user_id=owner_user_id,
        status=status,
        visibility=visibility,
        role="work",
        mime_type="image/webp",
        size_bytes=128,
        storage_backend="local-private",
        draft_storage_key=f"studio-v3/{media_id}.webp",
    )


def _seed(app):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import (
        Node,
        PresenceCollection,
        PresenceEditableConfig,
        PresenceNode,
        PresenceWork,
        User,
    )

    with app.app_context():
        tenant = Node(name="Studio V3 Test Tenant", slug="studio-v3-test", status="active")
        owner = User(
            username="bbb-owner",
            pseudonym="BBB Owner",
            email="bbb-owner@test.invalid",
            password="hash",
            role="participant",
        )
        other = User(
            username="other-owner",
            pseudonym="Other Owner",
            email="other-owner@test.invalid",
            password="hash",
            role="participant",
        )
        db.session.add_all([tenant, owner, other])
        db.session.flush()
        room = PresenceNode(
            tenant_id=tenant.id,
            owner_user_id=owner.id,
            slug="bbbvision",
            display_name="BBB Vision",
            status="published",
            visibility="public",
            public_status="public",
        )
        published_only_room = PresenceNode(
            tenant_id=tenant.id,
            owner_user_id=owner.id,
            slug="bbbvision-published-base",
            display_name="BBB Published Base",
            status="published",
            visibility="public",
            public_status="public",
        )
        empty_room = PresenceNode(
            tenant_id=tenant.id,
            owner_user_id=owner.id,
            slug="bbbvision-no-draft",
            display_name="BBB No Draft",
            status="draft",
            visibility="private",
        )
        other_room = PresenceNode(
            tenant_id=tenant.id,
            owner_user_id=other.id,
            slug="other-owner-room",
            display_name="Other Owner Room",
            status="draft",
            visibility="private",
        )
        db.session.add_all([room, published_only_room, empty_room, other_room])
        db.session.flush()

        owned_collection = PresenceCollection(
            node_id=room.id,
            title="Owned Studio V3 collection",
            sort_order=0,
        )
        foreign_room_collection = PresenceCollection(
            node_id=published_only_room.id,
            title="Same-owner foreign Room collection",
            sort_order=0,
        )
        foreign_owner_collection = PresenceCollection(
            node_id=other_room.id,
            title="Foreign-owner Room collection",
            sort_order=0,
        )
        db.session.add_all([owned_collection, foreign_room_collection, foreign_owner_collection])
        db.session.flush()
        owned_work = PresenceWork(
            node_id=room.id,
            collection_id=owned_collection.id,
            slug="owned-studio-v3-work",
            title="Owned Studio V3 work",
            sort_order=0,
        )
        foreign_room_work = PresenceWork(
            node_id=published_only_room.id,
            collection_id=foreign_room_collection.id,
            slug="same-owner-foreign-room-work",
            title="Same-owner foreign Room work",
            sort_order=0,
        )
        foreign_owner_work = PresenceWork(
            node_id=other_room.id,
            collection_id=foreign_owner_collection.id,
            slug="foreign-owner-room-work",
            title="Foreign-owner Room work",
            sort_order=0,
        )
        db.session.add_all([owned_work, foreign_room_work, foreign_owner_work])
        db.session.flush()

        published = PresenceEditableConfig(
            room_id=room.id,
            version=1,
            revision=1,
            status="published",
            **_sections("media-published-old", "published", private_media=False),
        )
        draft = PresenceEditableConfig(
            room_id=room.id,
            version=2,
            revision=1,
            status="draft",
            **_sections("media-owned-old", "draft"),
        )
        published_only = PresenceEditableConfig(
            room_id=published_only_room.id,
            version=1,
            revision=1,
            status="published",
            **_sections("media-published-base", "published-base", private_media=False),
        )
        db.session.add_all([published, draft, published_only])
        db.session.flush()
        db.session.add_all(
            [
                _media("media-owned-new", room.id, owner.id, "draft_uploaded"),
                _media("media-owned-old", room.id, owner.id, "draft_attached"),
                _media("media-published-old", room.id, owner.id, "published", "public_published"),
                _media("media-public", room.id, owner.id, "ready", "public_published"),
                _media("media-wrong-owner", room.id, other.id, "draft_uploaded"),
                _media("media-foreign-room", other_room.id, other.id, "draft_uploaded"),
                _media("media-published-base", published_only_room.id, owner.id, "published", "public_published"),
            ]
        )
        db.session.commit()
        return {
            "room_id": room.id,
            "published_only_room_id": published_only_room.id,
            "empty_room_id": empty_room.id,
            "other_room_id": other_room.id,
            "draft_id": draft.id,
            "published_id": published.id,
            "published_only_id": published_only.id,
            "owner_id": owner.id,
            "other_id": other.id,
            "owned_collection_id": owned_collection.id,
            "foreign_room_collection_id": foreign_room_collection.id,
            "foreign_owner_collection_id": foreign_owner_collection.id,
            "owned_work_id": owned_work.id,
            "foreign_room_work_id": foreign_room_work.id,
            "foreign_owner_work_id": foreign_owner_work.id,
        }


@pytest.fixture()
def setup_app():
    app = _build_app()
    ids = _seed(app)
    app.config.update(
        PRESENCE_STUDIO_V3_BACKEND_ENABLED=True,
        PRESENCE_STUDIO_V3_BACKEND_PILOT_IDS=(
            f"{ids['room_id']},{ids['published_only_room_id']},{ids['empty_room_id']}"
        ),
        PRESENCE_STUDIO_V3_BACKEND_PILOT_SLUGS="bbbvision,bbbvision-published-base,bbbvision-no-draft",
    )
    return app, ids


def _identity(app, config_id):
    from manara_backend_app.models import PresenceEditableConfig
    from manara_backend_app.services.presence_editor_config import studio_v3_config_identity

    with app.app_context():
        config = PresenceEditableConfig.query.get(config_id)
        return studio_v3_config_identity(config)


def _draft_request(app, ids, *, media_id="media-owned-new"):
    identity = _identity(app, ids["draft_id"])
    return {
        "expected": {
            key: identity[key]
            for key in ("room_id", "config_id", "version", "revision", "schema_version", "fingerprint")
        },
        "config": _transport_config(media_id),
    }


def _state_request(identity, metadata, *, metadata_revision=0):
    return {
        "expected": {
            "room_id": identity["room_id"],
            "config_id": identity["config_id"],
            "source_kind": identity["status"],
            "status": identity["status"],
            "version": identity["version"],
            "revision": identity["revision"],
            "schema_version": identity["schema_version"],
            "fingerprint": identity["fingerprint"],
            "metadata_revision": metadata_revision,
        },
        "metadata_schema_version": "presence-studio-v3-private-v1",
        "metadata": metadata,
    }


def _look_values():
    return {
        "background": "#050505",
        "accentColor": "#ffd84d",
        "texture": "ledger",
        "borderStyle": "ledger",
        "objectRadius": 2,
        "shadowDepth": 0.58,
        "headingWeight": 520,
        "motionIntensity": "gentle",
        "publicStylePreset": "bbbvision-threshold-gallery",
        "roomStyleId": "threshold-portal",
        "worldId": "gallery",
        "collectionPresentationId": "threshold-feature",
        "density": "focused",
        "pieceTreatment": "luminous-depth",
        "atmosphere": "nocturnal-depth",
        "journey": "threshold-reveal",
    }


def _valid_metadata(
    media_id="media-owned-new",
    *,
    source_ref="legacy-object:p1-proof-work",
    collection_source_ref="collection:loaded-owner-library",
):
    lock = {
        "id": "presence:1:motion-atmosphere",
        "scopeKind": "presence",
        "scopeId": "1",
        "layer": "motion-atmosphere",
        "value": {"background": "#050505", "motionIntensity": "gentle"},
        "reasonCode": "owner-lock",
    }
    placement = {
        "id": "placement:gallery:p1-proof-work",
        "roomId": "gallery",
        "sourceRef": source_ref,
        "collectionSourceRef": collection_source_ref,
        "objectId": "studio-v3:gallery:opaque",
        "order": 1,
        "status": "placed",
        "featured": True,
        "depth": 2,
        "visibility": "visible",
        "reasonCode": "placed",
    }
    room_style = {
        "roomId": "gallery",
        "styleId": "threshold-portal",
        "compositionToken": "portal-threshold",
    }
    threshold_room = {
        "roomId": "threshold",
        "order": 0,
        "styleId": "threshold-portal",
        "collectionPresentationId": "threshold-feature",
        "composition": {
            "layoutId": "portal-threshold",
            "placements": [
                {
                    "objectId": "object:threshold:hero",
                    "chamberId": "threshold",
                    "layoutId": "portal-threshold",
                    "zoneId": "threshold-image",
                    "order": 0,
                    "size": "feature",
                    "treatment": "framed",
                }
            ],
        },
        "baseObjectIds": ["object:threshold:hero"],
        "placements": [],
    }
    gallery_room = {
        "roomId": "gallery",
        "order": 1,
        "styleId": "threshold-portal",
        "collectionPresentationId": "threshold-feature",
        "composition": {
            "layoutId": "portal-threshold",
            "placements": [
                {
                    "objectId": "object:gallery:base",
                    "chamberId": "gallery",
                    "layoutId": "portal-threshold",
                    "zoneId": "threshold-image",
                    "order": 0,
                    "size": "feature",
                    "treatment": "framed",
                },
                {
                    "objectId": "placement:gallery:p1-proof-work",
                    "chamberId": "gallery",
                    "layoutId": "portal-threshold",
                    "zoneId": "threshold-statement",
                    "order": 0,
                    "size": "large",
                    "treatment": "captioned",
                },
            ],
        },
        "baseObjectIds": ["object:gallery:base"],
        "placements": [placement],
    }
    return {
        "owner_mode": "advanced-creative",
        "named_looks": [
            {
                "id": "named:p1-proof",
                "name": "P1 Proof",
                "baseLookId": "nocturnal-gallery",
                "values": _look_values(),
                "provenance": "saved-from:nocturnal-gallery",
                "mediaIds": [media_id],
                "createdAt": "2026-07-21T10:00:00Z",
                "updatedAt": "2026-07-21T10:00:00Z",
            }
        ],
        "layer_locks": [lock],
        "placements": [placement],
        "savepoints": [
            {
                "id": "savepoint:p1-before",
                "activeRoomId": "gallery",
                "activeLookId": "nocturnal-gallery",
                "roomOrder": ["threshold", "gallery"],
                "entryRoomId": "threshold",
                "rooms": [threshold_room, gallery_room],
                "layerValues": [
                    {
                        "scopeKind": "presence",
                        "scopeId": "1",
                        "layer": "motion-atmosphere",
                        "value": {"background": "#050505", "motionIntensity": "gentle"},
                    }
                ],
                "locks": [lock],
                "requiredCta": {
                    "visible": True,
                    "sourceRef": source_ref,
                    "destinationToken": "room:gallery",
                },
                "navigationToken": "room-order-v1",
                "baseRevision": 1,
                "fingerprint": "0123456789abcdef:0123456789abcdef",
                "createdAt": "2026-07-21T10:00:00Z",
            }
        ],
        "restore": {
            "activeSavepointId": "savepoint:p1-before",
            "lastRestoredSavepointId": "savepoint:p1-before",
            "activeRoomId": "gallery",
            "activeLookId": "named:p1-proof",
            "roomStyles": [room_style],
            "comparison": {"savepointId": "savepoint:p1-before", "view": "after"},
            "unresolvedRefs": [],
        },
        "compatibility": [
            {
                "sourceRef": source_ref,
                "roomId": "gallery",
                "roomStyleId": "threshold-portal",
                "status": "compatible",
                "reasonCode": "supported-image",
            }
        ],
    }


def test_private_savepoint_contract_round_trips_reference_only_structure_and_rejects_invalid_shapes(setup_app):
    from manara_backend_app.services.presence_studio_v3_state import (
        StudioV3PrivateStateError,
        normalise_studio_v3_private_metadata,
    )

    valid = _valid_metadata()
    cleaned = normalise_studio_v3_private_metadata(valid)
    assert cleaned == valid
    savepoint = cleaned["savepoints"][0]
    assert savepoint["activeRoomId"] == "gallery"
    assert savepoint["activeLookId"] == "nocturnal-gallery"
    assert savepoint["roomOrder"] == ["threshold", "gallery"]
    assert savepoint["rooms"][1]["composition"]["placements"][1]["objectId"] == "placement:gallery:p1-proof-work"
    assert savepoint["requiredCta"] == {
        "visible": True,
        "sourceRef": "legacy-object:p1-proof-work",
        "destinationToken": "room:gallery",
    }
    assert savepoint["navigationToken"] == "room-order-v1"
    assert savepoint["fingerprint"] == "0123456789abcdef:0123456789abcdef"

    invalid_metadata = []

    copied_content = copy.deepcopy(valid)
    copied_content["savepoints"][0]["rooms"][0]["title"] = "Copied canonical Room title"
    invalid_metadata.append(copied_content)

    copied_asset = copy.deepcopy(valid)
    copied_asset["savepoints"][0]["rooms"][0]["composition"]["placements"][0]["mediaUrl"] = "https://private.invalid/work.jpg"
    invalid_metadata.append(copied_asset)

    missing_reference = copy.deepcopy(valid)
    missing_reference["savepoints"][0]["rooms"][0]["composition"]["placements"][0]["objectId"] = "object:missing"
    invalid_metadata.append(missing_reference)

    zero_collection = copy.deepcopy(valid)
    zero_collection["placements"][0]["collectionSourceRef"] = "collection:0"
    invalid_metadata.append(zero_collection)

    arbitrary_library_collection = copy.deepcopy(valid)
    arbitrary_library_collection["placements"][0]["collectionSourceRef"] = "collection:loaded-owner-library-copy"
    invalid_metadata.append(arbitrary_library_collection)

    oversized_work = copy.deepcopy(valid)
    oversized_work["placements"][0]["sourceRef"] = "work:2147483648"
    invalid_metadata.append(oversized_work)

    wrong_chamber = copy.deepcopy(valid)
    wrong_chamber["savepoints"][0]["rooms"][0]["composition"]["placements"][0]["chamberId"] = "gallery"
    invalid_metadata.append(wrong_chamber)

    mismatched_layout = copy.deepcopy(valid)
    mismatched_layout["savepoints"][0]["rooms"][0]["composition"]["layoutId"] = "gallery-wall"
    invalid_metadata.append(mismatched_layout)

    unresolved_active_room = copy.deepcopy(valid)
    unresolved_active_room["savepoints"][0]["activeRoomId"] = "missing-room"
    invalid_metadata.append(unresolved_active_room)

    inconsistent_room_order = copy.deepcopy(valid)
    inconsistent_room_order["savepoints"][0]["roomOrder"] = ["gallery", "threshold"]
    invalid_metadata.append(inconsistent_room_order)

    unsafe_destination = copy.deepcopy(valid)
    unsafe_destination["savepoints"][0]["requiredCta"]["destinationToken"] = "https://private.invalid/next"
    invalid_metadata.append(unsafe_destination)

    unsupported_navigation = copy.deepcopy(valid)
    unsupported_navigation["savepoints"][0]["navigationToken"] = "threshold-to-gallery"
    invalid_metadata.append(unsupported_navigation)

    invalid_fingerprint = copy.deepcopy(valid)
    invalid_fingerprint["savepoints"][0]["fingerprint"] = "not-a-structural-digest"
    invalid_metadata.append(invalid_fingerprint)

    legacy_lossy_shape = copy.deepcopy(valid)
    legacy = legacy_lossy_shape["savepoints"][0]
    legacy["roomStyles"] = [{"roomId": "gallery", "styleId": "threshold-portal", "compositionToken": "portal-threshold"}]
    legacy["requiredCtaVisible"] = True
    legacy["lookId"] = legacy.pop("activeLookId")
    legacy.pop("activeRoomId")
    legacy.pop("rooms")
    legacy.pop("requiredCta")
    legacy.pop("fingerprint")
    invalid_metadata.append(legacy_lossy_shape)

    for metadata in invalid_metadata:
        with pytest.raises(StudioV3PrivateStateError):
            normalise_studio_v3_private_metadata(metadata)


def test_stable_semantic_fingerprint_matches_frontend_vector_and_narrow_projection(setup_app):
    from manara_backend_app.services.presence_editor_config import (
        PresenceEditorConfigError,
        fingerprint_studio_v3_comparable_config,
    )

    base = {
        "schema_version": "presence-editable-config-v1",
        "renderer_key": "presence-studio-v2-room",
        "scene_config": {"private": {"media_id": "media-1", "visibility": "private_draft", "url": "https://signed-a", "preview_expires_at": 1, "image_url": "https://stored/image.webp"}},
        "style_dna": {"studio_v2": {"skin": "dark"}},
        "motion_config": {"studio_v2": {"intensity": "gentle"}},
        "asset_config": {},
        "content_config": {},
        "roomkey_config": {},
        "enquiry_config": {},
        "locked_fields": {},
    }
    fingerprint = fingerprint_studio_v3_comparable_config(base)
    assert fingerprint == "34c344608ab7982fe799d9dc7d6cbad3bc628b7d00a4ecd814286031c170bdad"
    regenerated = copy.deepcopy(base)
    regenerated["scene_config"]["private"]["url"] = "https://signed-b"
    regenerated["scene_config"]["private"]["preview_expires_at"] = 2
    assert fingerprint_studio_v3_comparable_config(regenerated) == fingerprint
    changed_image = copy.deepcopy(base)
    changed_image["scene_config"]["private"]["image_url"] = "https://stored/changed.webp"
    assert fingerprint_studio_v3_comparable_config(changed_image) != fingerprint
    changed_public_url = copy.deepcopy(base)
    changed_public_url["scene_config"]["public"] = {"url": "https://public/changed"}
    assert fingerprint_studio_v3_comparable_config(changed_public_url) != fingerprint

    hostile_key_order = copy.deepcopy(base)
    hostile_key_order["content_config"] = {
        "z": 1,
        "A": 2,
        "_": 3,
        "\u00e9": 4,
        "\u00e4": 5,
        "\u03a9": 6,
        "\U0001f600": 7,
        "nested": {"b": True, "B": False, "\u00f8": "safe"},
    }
    assert fingerprint_studio_v3_comparable_config(hostile_key_order) == (
        "d8c99f6f5bea90b68cd55f4e43dfb96ecf7b05707473e4f66a1811ac55b272f0"
    )

    numeric = {
        **base,
        "scene_config": {},
        "style_dna": {},
        "motion_config": {},
        "content_config": {
            "integer_float": 1.0,
            "negative_zero": -0.0,
            "small": 1e-7,
            "fixed": 1e-6,
        },
    }
    assert fingerprint_studio_v3_comparable_config(numeric) == (
        "30b59ddb5e9536abd41453fcb17a6ed9f520bec0ae196e1b2ad92ab5f31f2d09"
    )
    unsafe_numeric = copy.deepcopy(numeric)
    unsafe_numeric["content_config"]["large"] = 1e20
    with pytest.raises(PresenceEditorConfigError):
        fingerprint_studio_v3_comparable_config(unsafe_numeric)
    lone_surrogate = {
        **base,
        "scene_config": {},
        "style_dna": {"studio_v2": {"x": "\ud800"}},
        "motion_config": {},
    }
    assert fingerprint_studio_v3_comparable_config(lone_surrogate) == (
        "1b4d9d279927deee13626ae9eefeef490ad67ff1949861e329784a554c685bfc"
    )


def test_atomic_existing_draft_replacement_is_authoritative_and_updates_media_together(setup_app):
    from manara_backend_app.models import PresenceEditableConfig, PresenceMediaAsset

    app, ids = setup_app
    client = app.test_client()
    headers = _headers(app, "bbb-owner")
    public_before_response = client.get("/api/presence/public/bbbvision", base_url="http://public.test")
    assert public_before_response.status_code == 200
    public_before_payload = public_before_response.get_json()
    assert isinstance(public_before_payload.get("data"), dict)
    public_before = public_before_payload["data"]
    response = client.put(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/draft",
        headers=headers,
        json=_draft_request(app, ids),
        base_url="http://public.test",
    )
    assert response.status_code == 200, response.get_json()
    payload = response.get_json()["data"]
    assert payload["draft"]["id"] == ids["draft_id"]
    assert payload["draft"]["revision"] == 2
    assert payload["committed"]["revision"] == 2
    assert payload["committed"]["status"] == "draft"
    assert payload["committed"]["fingerprint"] == _identity(app, ids["draft_id"])["fingerprint"]

    with app.app_context():
        draft = PresenceEditableConfig.query.get(ids["draft_id"])
        published = PresenceEditableConfig.query.get(ids["published_id"])
        assert draft.scene_config_json["studio_v2"]["objectIds"] == ["keep", "new"]
        assert "stale" not in json.dumps(draft.content_config_json)
        assert draft.scene_config_json["scene_canary"] == {"keep": True}
        assert draft.locked_fields_json == {"server_canary": {"keep": True}}
        assert published.revision == 1
        assert published.scene_config_json["studio_v2"]["marker"] == "published"
        assert PresenceMediaAsset.query.get("media-owned-new").status == "draft_attached"
        assert PresenceMediaAsset.query.get("media-owned-old").status == "orphaned"
        published_media = PresenceMediaAsset.query.get("media-published-old")
        assert published_media.status == "published"
        assert published_media.visibility == "public_published"

    public_after_response = client.get("/api/presence/public/bbbvision", base_url="http://public.test")
    assert public_after_response.status_code == 200
    public_after_payload = public_after_response.get_json()
    assert isinstance(public_after_payload.get("data"), dict)
    public_after = public_after_payload["data"]
    assert public_after == public_before


def test_atomic_conflicts_and_no_draft_case_have_zero_mutation(setup_app):
    from manara_backend_app.models import PresenceEditableConfig, PresenceMediaAsset

    app, ids = setup_app
    client = app.test_client()
    headers = _headers(app, "bbb-owner")
    baseline = _draft_request(app, ids)
    conflict_changes = [
        {"room_id": ids["empty_room_id"]},
        {"config_id": ids["published_id"]},
        {"version": baseline["expected"]["version"] + 1},
        {"revision": baseline["expected"]["revision"] + 1},
        {"schema_version": "presence-editable-config-v2"},
        {"fingerprint": "0" * 64},
    ]
    for change in conflict_changes:
        request_body = copy.deepcopy(baseline)
        request_body["expected"].update(change)
        response = client.put(
            f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/draft",
            headers=headers,
            json=request_body,
            base_url="http://public.test",
        )
        assert response.status_code == 409, (change, response.get_json())
        assert response.get_json()["error"]["code"] == "studio_v3_draft_conflict"

    no_draft_request = copy.deepcopy(baseline)
    no_draft_request["expected"].update(
        {
            "room_id": ids["empty_room_id"],
            "config_id": 999999,
            "version": 1,
            "revision": 1,
            "fingerprint": "0" * 64,
        }
    )
    response = client.put(
        f"/api/presence/owner/rooms/{ids['empty_room_id']}/editor/v3/draft",
        headers=headers,
        json=no_draft_request,
        base_url="http://public.test",
    )
    assert response.status_code == 409, response.get_json()

    with app.app_context():
        draft = PresenceEditableConfig.query.get(ids["draft_id"])
        assert draft.revision == 1
        assert draft.scene_config_json["studio_v2"]["marker"] == "draft"
        assert PresenceEditableConfig.query.filter_by(room_id=ids["empty_room_id"], status="draft").count() == 0
        assert PresenceMediaAsset.query.get("media-owned-new").status == "draft_uploaded"
        assert PresenceMediaAsset.query.get("media-owned-old").status == "draft_attached"


def test_atomic_replacement_rejects_unowned_paths_and_media_without_mutation(setup_app):
    from manara_backend_app.models import PresenceEditableConfig, PresenceMediaAsset

    app, ids = setup_app
    client = app.test_client()
    headers = _headers(app, "bbb-owner")
    unowned = _draft_request(app, ids)
    unowned["config"]["scene_config"]["scene_canary"] = {"changed": True}
    response = client.put(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/draft",
        headers=headers,
        json=unowned,
        base_url="http://public.test",
    )
    assert response.status_code == 422, response.get_json()

    wrong_media = _draft_request(app, ids, media_id="media-wrong-owner")
    response = client.put(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/draft",
        headers=headers,
        json=wrong_media,
        base_url="http://public.test",
    )
    assert response.status_code == 422, response.get_json()
    with app.app_context():
        assert PresenceEditableConfig.query.get(ids["draft_id"]).revision == 1
        assert PresenceMediaAsset.query.get("media-owned-old").status == "draft_attached"


def test_atomic_route_rolls_back_config_and_media_when_downstream_response_fails(setup_app, monkeypatch):
    from manara_backend_app.models import PresenceEditableConfig, PresenceMediaAsset
    from manara_backend_app.services import presence_editor_config as editor_service

    app, ids = setup_app
    client = app.test_client()
    headers = _headers(app, "bbb-owner")
    request_body = _draft_request(app, ids)

    def injected_failure(_config):
        raise RuntimeError("injected post-mutation failure")

    monkeypatch.setattr(editor_service, "studio_v3_config_identity", injected_failure)
    response = client.put(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/draft",
        headers=headers,
        json=request_body,
        base_url="http://public.test",
    )
    assert response.status_code == 500, response.get_json()
    assert response.get_json()["error"]["code"] == "studio_v3_draft_replace_failed"
    with app.app_context():
        draft = PresenceEditableConfig.query.get(ids["draft_id"])
        assert draft.revision == 1
        assert draft.scene_config_json["studio_v2"]["marker"] == "draft"
        assert PresenceMediaAsset.query.get("media-owned-new").status == "draft_uploaded"
        assert PresenceMediaAsset.query.get("media-owned-old").status == "draft_attached"


def test_private_state_accepts_exact_published_fallback_base_and_round_trips_reference_state(setup_app):
    from manara_backend_app.models import PresenceEditableConfig, PresenceStudioV3State

    app, ids = setup_app
    client = app.test_client()
    headers = _headers(app, "bbb-owner")
    identity = _identity(app, ids["published_only_id"])
    request_body = _state_request(identity, _valid_metadata("media-published-base"))
    response = client.put(
        f"/api/presence/owner/rooms/{ids['published_only_room_id']}/editor/v3/state",
        headers=headers,
        json=request_body,
        base_url="http://public.test",
    )
    assert response.status_code == 200, response.get_json()
    state = response.get_json()["data"]["state"]
    assert state["metadata_revision"] == 1
    assert state["base"]["source_kind"] == "published"
    assert state["base"]["status"] == "published"
    assert state["base"]["fingerprint"] == identity["fingerprint"]
    assert "owner_user_id" not in state
    assert state["metadata"]["restore"]["activeRoomId"] == "gallery"
    assert state["metadata"]["restore"]["activeLookId"] == "named:p1-proof"
    assert state["metadata"]["named_looks"][0]["values"] == _look_values()

    read = client.get(
        f"/api/presence/owner/rooms/{ids['published_only_room_id']}/editor/v3/state",
        headers=headers,
        base_url="http://public.test",
    )
    assert read.status_code == 200
    assert read.get_json()["data"]["state"] == state
    with app.app_context():
        published = PresenceEditableConfig.query.get(ids["published_only_id"])
        assert published.status == "published"
        assert published.revision == 1
        assert PresenceStudioV3State.query.filter_by(room_id=ids["published_only_room_id"]).count() == 1


def test_private_state_numeric_sources_are_room_scoped_with_zero_mutation_on_rejection(setup_app):
    from manara_backend_app.models import PresenceStudioV3State

    app, ids = setup_app
    client = app.test_client()
    headers = _headers(app, "bbb-owner")
    identity = _identity(app, ids["draft_id"])
    owned_work_ref = f"work:{ids['owned_work_id']}"
    owned_collection_ref = f"collection:{ids['owned_collection_id']}"
    owned_metadata = _valid_metadata(
        source_ref=owned_work_ref,
        collection_source_ref=owned_collection_ref,
    )
    harmless_foreign_shaped_name = f"work:{ids['foreign_owner_work_id']}"
    owned_metadata["named_looks"][0]["name"] = harmless_foreign_shaped_name
    response = client.put(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/state",
        headers=headers,
        json=_state_request(identity, owned_metadata),
        base_url="http://public.test",
    )
    assert response.status_code == 200, response.get_json()
    saved_metadata = response.get_json()["data"]["state"]["metadata"]
    assert saved_metadata["placements"][0]["sourceRef"] == owned_work_ref
    assert saved_metadata["placements"][0]["collectionSourceRef"] == owned_collection_ref
    assert saved_metadata["savepoints"][0]["rooms"][1]["placements"][0]["sourceRef"] == owned_work_ref
    assert saved_metadata["savepoints"][0]["rooms"][1]["placements"][0]["collectionSourceRef"] == owned_collection_ref
    assert saved_metadata["savepoints"][0]["requiredCta"]["sourceRef"] == owned_work_ref
    assert saved_metadata["compatibility"][0]["sourceRef"] == owned_work_ref
    assert saved_metadata["named_looks"][0]["name"] == harmless_foreign_shaped_name

    rejected_refs = (
        ("work:2147483648", owned_collection_ref),
        ("work:2147483647", owned_collection_ref),
        (f"work:{ids['foreign_room_work_id']}", owned_collection_ref),
        (f"work:{ids['foreign_owner_work_id']}", owned_collection_ref),
        (owned_work_ref, "collection:2147483647"),
        (owned_work_ref, f"collection:{ids['foreign_room_collection_id']}"),
        (owned_work_ref, f"collection:{ids['foreign_owner_collection_id']}"),
    )
    for source_ref, collection_source_ref in rejected_refs:
        rejected_metadata = _valid_metadata(
            source_ref=source_ref,
            collection_source_ref=collection_source_ref,
        )
        rejected = client.put(
            f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/state",
            headers=headers,
            json=_state_request(identity, rejected_metadata, metadata_revision=1),
            base_url="http://public.test",
        )
        assert rejected.status_code == 422, rejected.get_json()
        with app.app_context():
            state = PresenceStudioV3State.query.filter_by(room_id=ids["room_id"]).one()
            assert state.metadata_revision == 1
            assert state.metadata_json == saved_metadata

def test_private_state_revision_and_base_conflicts_have_zero_mutation(setup_app):
    from manara_backend_app.models import PresenceStudioV3State

    app, ids = setup_app
    client = app.test_client()
    headers = _headers(app, "bbb-owner")
    identity = _identity(app, ids["draft_id"])
    first = client.put(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/state",
        headers=headers,
        json=_state_request(identity, {"owner_mode": "simple"}),
        base_url="http://public.test",
    )
    assert first.status_code == 200, first.get_json()

    stale_revision = _state_request(identity, {"owner_mode": "advanced-creative"}, metadata_revision=0)
    response = client.put(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/state",
        headers=headers,
        json=stale_revision,
        base_url="http://public.test",
    )
    assert response.status_code == 409, response.get_json()

    stale_schema = _state_request(identity, {"owner_mode": "advanced-creative"}, metadata_revision=1)
    stale_schema["expected"]["schema_version"] = "presence-editable-config-v2"
    response = client.put(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/state",
        headers=headers,
        json=stale_schema,
        base_url="http://public.test",
    )
    assert response.status_code == 409, response.get_json()

    stale_base = _state_request(identity, {"owner_mode": "advanced-creative"}, metadata_revision=1)
    stale_base["expected"]["fingerprint"] = "0" * 64
    response = client.put(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/state",
        headers=headers,
        json=stale_base,
        base_url="http://public.test",
    )
    assert response.status_code == 409, response.get_json()
    with app.app_context():
        state = PresenceStudioV3State.query.filter_by(room_id=ids["room_id"]).one()
        assert state.metadata_revision == 1
        assert state.metadata_json == {"owner_mode": "simple"}


def test_private_state_requires_explicit_rebase_and_preserves_published_state_when_a_draft_appears(setup_app):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import PresenceEditableConfig, PresenceStudioV3State

    app, ids = setup_app
    client = app.test_client()
    headers = _headers(app, "bbb-owner")
    published_identity = _identity(app, ids["published_only_id"])
    first = client.put(
        f"/api/presence/owner/rooms/{ids['published_only_room_id']}/editor/v3/state",
        headers=headers,
        json=_state_request(published_identity, {"owner_mode": "simple"}),
        base_url="http://public.test",
    )
    assert first.status_code == 200, first.get_json()
    original_state = first.get_json()["data"]["state"]

    with app.app_context():
        draft = PresenceEditableConfig(
            room_id=ids["published_only_room_id"],
            version=2,
            revision=1,
            status="draft",
            **_sections("media-published-base", "transition-draft", private_media=False),
        )
        db.session.add(draft)
        db.session.commit()
        draft_id = draft.id

    draft_identity = _identity(app, draft_id)
    attempted_rebase = client.put(
        f"/api/presence/owner/rooms/{ids['published_only_room_id']}/editor/v3/state",
        headers=headers,
        json=_state_request(
            draft_identity,
            {"owner_mode": "advanced-creative"},
            metadata_revision=original_state["metadata_revision"],
        ),
        base_url="http://public.test",
    )
    assert attempted_rebase.status_code == 409, attempted_rebase.get_json()
    assert attempted_rebase.get_json()["error"]["details"]["mismatch"].startswith("stored_base.")

    with app.app_context():
        state = PresenceStudioV3State.query.filter_by(room_id=ids["published_only_room_id"]).one()
        assert state.metadata_revision == original_state["metadata_revision"]
        assert state.base_config_id == ids["published_only_id"]
        assert state.base_source_kind == "published"
        assert state.base_fingerprint == published_identity["fingerprint"]
        assert state.metadata_json == {"owner_mode": "simple"}


def test_legacy_draft_patch_requests_the_shared_row_lock(setup_app, monkeypatch):
    from sqlalchemy.orm import Query

    app, ids = setup_app
    client = app.test_client()
    headers = _headers(app, "bbb-owner")
    original_with_for_update = Query.with_for_update
    lock_calls = []

    def tracked_with_for_update(query, *args, **kwargs):
        lock_calls.append(True)
        return original_with_for_update(query, *args, **kwargs)

    monkeypatch.setattr(Query, "with_for_update", tracked_with_for_update)
    response = client.patch(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/draft",
        headers=headers,
        json={"style_dna": {"legacy_lock_probe": True}},
        base_url="http://public.test",
    )
    assert response.status_code == 200, response.get_json()
    assert lock_calls, "legacy draft mutation must request SELECT ... FOR UPDATE"


def test_publish_synchronization_code_is_limited_to_the_draft_row_without_invoking_publish():
    from manara_backend_app.services import presence_editor_config

    source = inspect.getsource(presence_editor_config.publish_draft_config)
    compact = "".join(source.split())
    assert "draft=draft_config_for_room(room,for_update=True)" in compact
    assert "published=published_config_for_room(room)" in compact
    assert "published_config_for_room(room,for_update=True)" not in compact


def test_orphan_cleanup_locks_draft_before_media_rows(setup_app, monkeypatch):
    from sqlalchemy.orm import Query

    from manara_backend_app.extensions import db
    from manara_backend_app.models import PresenceEditableConfig, PresenceMediaAsset, PresenceNode
    from manara_backend_app.services import presence_editor_config
    from manara_backend_app.time_utils import now_utc

    app, ids = setup_app
    with app.app_context():
        media_asset = db.session.get(PresenceMediaAsset, "media-owned-new")
        media_asset.status = "orphaned"
        media_asset.created_at = now_utc() - timedelta(days=2)
        db.session.commit()

        lock_order = []
        original_with_for_update = Query.with_for_update

        def tracked_with_for_update(query, *args, **kwargs):
            entity = query.column_descriptions[0].get("entity")
            lock_order.append(entity)
            return original_with_for_update(query, *args, **kwargs)

        monkeypatch.setattr(Query, "with_for_update", tracked_with_for_update)
        monkeypatch.setattr(presence_editor_config, "delete_private_media_object", lambda _asset: None)

        room = db.session.get(PresenceNode, ids["room_id"])
        deleted = presence_editor_config.cleanup_orphaned_private_media(
            room,
            minimum_age_seconds=0,
        )

        assert deleted == 1
        assert lock_order == [PresenceEditableConfig, PresenceMediaAsset]


def test_private_state_rejects_unsafe_metadata_and_unowned_media(setup_app):
    from manara_backend_app.models import PresenceStudioV3State

    app, ids = setup_app
    client = app.test_client()
    headers = _headers(app, "bbb-owner")
    identity = _identity(app, ids["draft_id"])
    invalid_metadata = []

    unknown = _valid_metadata()
    unknown["visitor_copy"] = {"headline": "copied"}
    invalid_metadata.append(unknown)
    for unsafe_name in (
        "https://private.invalid/look",
        "data:image/png;base64,AAAA",
        "Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature",
        r"C:\private\look.json",
        "GGM private fixture",
        "owner@test.invalid",
    ):
        metadata = _valid_metadata()
        metadata["named_looks"][0]["name"] = unsafe_name
        invalid_metadata.append(metadata)
    copied = _valid_metadata()
    copied["named_looks"][0]["title"] = "Copied Work title"
    invalid_metadata.append(copied)
    raw_owner = _valid_metadata()
    raw_owner["named_looks"][0]["owner_id"] = ids["owner_id"]
    invalid_metadata.append(raw_owner)
    incomplete_look = _valid_metadata()
    incomplete_look["named_looks"][0]["values"].pop("journey")
    invalid_metadata.append(incomplete_look)
    invalid_metadata.append(_valid_metadata("media-wrong-owner"))
    invalid_metadata.append(_valid_metadata("media-foreign-room"))

    for metadata in invalid_metadata:
        response = client.put(
            f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/state",
            headers=headers,
            json=_state_request(identity, metadata),
            base_url="http://public.test",
        )
        assert response.status_code == 422, response.get_json()
    with app.app_context():
        assert PresenceStudioV3State.query.filter_by(room_id=ids["room_id"]).count() == 0


def test_wrong_owner_cannot_read_or_replace_private_state_or_atomic_draft(setup_app):
    app, ids = setup_app
    client = app.test_client()
    headers = _headers(app, "other-owner")
    draft_response = client.put(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/draft",
        headers=headers,
        json=_draft_request(app, ids),
        base_url="http://public.test",
    )
    state_response = client.put(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/state",
        headers=headers,
        json=_state_request(_identity(app, ids["draft_id"]), {"owner_mode": "simple"}),
        base_url="http://public.test",
    )
    state_read = client.get(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/state",
        headers=headers,
        base_url="http://public.test",
    )
    assert draft_response.status_code == 403
    assert state_response.status_code == 403
    assert state_read.status_code == 403


def test_private_state_is_excluded_from_public_and_existing_owner_editor_payloads(setup_app):
    app, ids = setup_app
    client = app.test_client()
    headers = _headers(app, "bbb-owner")
    identity = _identity(app, ids["draft_id"])
    response = client.put(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/state",
        headers=headers,
        json=_state_request(identity, _valid_metadata()),
        base_url="http://public.test",
    )
    assert response.status_code == 200, response.get_json()

    public_response = client.get("/api/presence/public/bbbvision", base_url="http://public.test")
    assert public_response.status_code == 200
    public_payload = public_response.get_json()
    assert isinstance(public_payload.get("data"), dict)
    owner_payload = client.get(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor",
        headers=headers,
        base_url="http://public.test",
    ).get_json()
    serialized_public = json.dumps(public_payload, sort_keys=True)
    serialized_owner = json.dumps(owner_payload, sort_keys=True)
    for forbidden in (
        "presence_studio_v3_state",
        "metadata_revision",
        "named:p1-proof",
        "savepoint:p1-before",
        "layer_locks",
    ):
        assert forbidden not in serialized_public
        assert forbidden not in serialized_owner
    for private_transport in (
        "private_draft",
        "signed.invalid",
        "preview_expires_at",
        "media_id",
    ):
        assert private_transport not in serialized_public


def test_atomic_rejects_unkeyed_or_false_private_media_and_private_metadata_without_mutation(setup_app):
    from manara_backend_app.models import PresenceEditableConfig, PresenceMediaAsset

    app, ids = setup_app
    client = app.test_client()
    headers = _headers(app, "bbb-owner")
    cases = []
    unkeyed = _draft_request(app, ids)
    unkeyed["config"]["asset_config"]["studio_v2"]["assets"] = [
        {"visibility": "private_draft", "url": "https://private.invalid/signed-preview"}
    ]
    cases.append(unkeyed)
    false_private = _draft_request(app, ids)
    false_private["config"]["asset_config"]["studio_v2"]["assets"] = [
        {
            "media_id": "media-public",
            "visibility": "private_draft",
            "url": "https://private.invalid/false-claim",
        }
    ]
    cases.append(false_private)
    for category in ("namedLooks", "layerLocks", "savepoints", "ownerMode", "restore", "compatibility"):
        private_metadata = _draft_request(app, ids)
        private_metadata["config"]["content_config"]["studio_v2"][category] = [] if category != "ownerMode" else "simple"
        cases.append(private_metadata)
    private_placement = _draft_request(app, ids)
    private_placement["config"]["content_config"]["studio_v2"]["placements"] = [
        {"id": "private-placement", "roomId": "gallery", "status": "placed"}
    ]
    cases.append(private_placement)
    for section_name in ("style_dna", "motion_config", "roomkey_config", "enquiry_config"):
        unregistered_media = _draft_request(app, ids)
        unregistered_media["config"][section_name]["studio_v2"]["backgroundMedia"] = {
            "media_id": "media-wrong-owner",
            "visibility": "private_draft",
            "url": "https://signed.invalid/cross-owner",
            "preview_expires_at": 123,
        }
        cases.append(unregistered_media)

    for request_body in cases:
        response = client.put(
            f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/draft",
            headers=headers,
            json=request_body,
            base_url="http://public.test",
        )
        assert response.status_code == 422, response.get_json()
        with app.app_context():
            assert PresenceEditableConfig.query.get(ids["draft_id"]).revision == 1
            assert PresenceMediaAsset.query.get("media-owned-new").status == "draft_uploaded"
            assert PresenceMediaAsset.query.get("media-owned-old").status == "draft_attached"


def test_atomic_preserves_unowned_private_media_canary_when_securing_owned_subtree(setup_app):
    from manara_backend_app.models import PresenceEditableConfig, PresenceMediaAsset

    app, ids = setup_app
    client = app.test_client()
    headers = _headers(app, "bbb-owner")
    unowned_canary = {
        "keep": True,
        "private_reference": {
            "media_id": "media-owned-old",
            "visibility": "private_draft",
            "url": "legacy-unowned-canary",
            "image_url": "legacy-unowned-image-canary",
        },
    }
    with app.app_context():
        draft = PresenceEditableConfig.query.get(ids["draft_id"])
        draft.asset_config_json = {**draft.asset_config_json, "asset_canary": copy.deepcopy(unowned_canary)}
        app.extensions["sqlalchemy"].session.commit()

    request_body = _draft_request(app, ids)
    request_body["config"]["asset_config"]["asset_canary"] = copy.deepcopy(unowned_canary)
    response = client.put(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/draft",
        headers=headers,
        json=request_body,
        base_url="http://public.test",
    )
    assert response.status_code == 200, response.get_json()
    with app.app_context():
        draft = PresenceEditableConfig.query.get(ids["draft_id"])
        assert draft.asset_config_json["asset_canary"] == unowned_canary
        assert PresenceMediaAsset.query.get("media-owned-old").status == "draft_attached"


def test_v3_routes_serialize_before_commit_and_are_production_hard_false(setup_app, monkeypatch):
    from manara_backend_app.models import PresenceEditableConfig, PresenceMediaAsset, PresenceStudioV3State
    import manara_backend_app.api.presence_graph as route_module

    app, ids = setup_app
    client = app.test_client()
    headers = _headers(app, "bbb-owner")
    request_body = _draft_request(app, ids)
    original_draft_serializer = route_module.serialize_editor_config
    monkeypatch.setattr(route_module, "serialize_editor_config", lambda _draft: (_ for _ in ()).throw(RuntimeError("serialize")))
    response = client.put(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/draft",
        headers=headers,
        json=request_body,
        base_url="http://public.test",
    )
    assert response.status_code == 500
    with app.app_context():
        assert PresenceEditableConfig.query.get(ids["draft_id"]).revision == 1
        assert PresenceMediaAsset.query.get("media-owned-new").status == "draft_uploaded"
        assert PresenceMediaAsset.query.get("media-owned-old").status == "draft_attached"

    monkeypatch.setattr(route_module, "serialize_editor_config", original_draft_serializer)
    original_state_serializer = route_module.serialize_studio_v3_private_state
    monkeypatch.setattr(route_module, "serialize_studio_v3_private_state", lambda _state: (_ for _ in ()).throw(RuntimeError("serialize")))
    state_request = _state_request(_identity(app, ids["published_id"]), _valid_metadata("media-owned-old"))
    response = client.put(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/state",
        headers=headers,
        json=state_request,
        base_url="http://public.test",
    )
    assert response.status_code == 500
    with app.app_context():
        assert PresenceStudioV3State.query.filter_by(room_id=ids["room_id"]).first() is None
    monkeypatch.setattr(route_module, "serialize_studio_v3_private_state", original_state_serializer)

    other_scope_response = client.get(
        f"/api/presence/owner/rooms/{ids['other_room_id']}/editor/v3/state",
        headers=_headers(app, "other-owner"),
        base_url="http://public.test",
    )
    assert other_scope_response.status_code == 404

    for environment_key in ("APP_ENV", "ENVIRONMENT", "VERCEL_ENV"):
        monkeypatch.delenv(environment_key, raising=False)
    monkeypatch.setenv("FLASK_ENV", "qa-unknown")
    app.config.update(
        TESTING=False,
        FLASK_ENV="qa-unknown",
        ENV=None,
        APP_ENV=None,
        ENVIRONMENT=None,
        VERCEL_ENV=None,
        PRESENCE_STUDIO_V3_BACKEND_ENABLED=True,
        PRESENCE_STUDIO_V3_BACKEND_PILOT_IDS=str(ids["room_id"]),
        PRESENCE_STUDIO_V3_BACKEND_PILOT_SLUGS="bbbvision",
    )
    response = client.get(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/state",
        headers=headers,
        base_url="http://public.test",
    )
    assert response.status_code == 404

    monkeypatch.setenv("FLASK_ENV", "local")
    app.config.update(FLASK_ENV="local")
    response = client.get(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/state",
        headers=headers,
        base_url="http://public.test",
    )
    assert response.status_code == 200

    monkeypatch.setenv("FLASK_ENV", "production")
    app.config.update(TESTING=False, FLASK_ENV="production", PRESENCE_STUDIO_V3_BACKEND_ENABLED=True)
    response = client.get(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/state",
        headers=headers,
        base_url="http://public.test",
    )
    assert response.status_code == 404

    app.config.update(
        FLASK_ENV="development",
        VERCEL_ENV="production",
        PRESENCE_STUDIO_V3_BACKEND_ENABLED=True,
        PRESENCE_STUDIO_V3_BACKEND_PILOT_IDS=str(ids["room_id"]),
        PRESENCE_STUDIO_V3_BACKEND_PILOT_SLUGS="bbbvision",
    )
    monkeypatch.setenv("FLASK_ENV", "development")
    response = client.get(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/state",
        headers=headers,
        base_url="http://public.test",
    )
    assert response.status_code == 404

    app.config.update(VERCEL_ENV="development", PRESENCE_STUDIO_V3_BACKEND_ENABLED=False)
    response = client.get(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/state",
        headers=headers,
        base_url="http://public.test",
    )
    assert response.status_code == 404


def test_private_state_rejects_scheme_less_domain_text(setup_app):
    app, ids = setup_app
    client = app.test_client()
    headers = _headers(app, "bbb-owner")
    for unsafe_name in (
        "private.example.com/preview",
        "private.example.xyz/preview",
        "127.0.0.1/preview",
        "Preview:private.example.xyz/preview",
        "ref=private.example.xyz/preview",
        "foo,private.example.xyz/preview",
        "[::1]/preview",
        r"path=C:\private\preview",
        r"Preview:C:\private\look",
        "ref=/private/preview",
        "prefix:/Users/alice/private-preview",
        "token=" + "sk-" + "testsecret123456",
        "note " + "ghp_" + "abcdefghijklmnopqrstuvwxyz",
        "session=eyJhbGciOiJIUzI1NiJ9.payload.sig",
        "AKIA" + "IOSFODNN7EXAMPLE",
        "blob=" + "A" * 70,
        "data64:" + "A" * 70,
        "Preview%3Ahttps%3A%2F%2Fprivate.example.xyz%2Fpreview",
    ):
        metadata = _valid_metadata("media-owned-old")
        metadata["named_looks"][0]["name"] = unsafe_name
        response = client.put(
            f"/api/presence/owner/rooms/{ids['room_id']}/editor/v3/state",
            headers=headers,
            json=_state_request(_identity(app, ids["published_id"]), metadata),
            base_url="http://public.test",
        )
        assert response.status_code == 422, (unsafe_name, response.get_json())
