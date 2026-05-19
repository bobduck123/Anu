import os

os.environ.setdefault("FLASK_ENV", "testing")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-presence-customisation-1234")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-for-presence-customisation-1234")

from backend_factory import load_create_app  # noqa: E402


def _build_app():
    create_app = load_create_app()
    return create_app(
        {
            "TESTING": True,
            "FLASK_ENV": "production",
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
            "CORS_ORIGINS": ["https://your-presence.vercel.app"],
        }
    )


def test_customisation_manifest_endpoint_returns_stable_schema_and_core_options():
    app = _build_app()
    client = app.test_client()

    response = client.get("/api/presence/customisation/manifest", base_url="http://public.test")

    assert response.status_code == 200, response.get_json()
    data = response.get_json()["data"]
    assert data["schema_version"] == "presence-customisation-manifest-v1"
    assert data["roomgraph_schema_version"] == "presence-roomgraph-v1"

    assert {"artist", "dj", "maker", "practitioner", "consultant", "organisation", "local_business"}.issubset(
        {item["id"] for item in data["archetypes"]}
    )
    assert {"rooms-gallery-painter", "rooms-underground-dj", "rooms-material-carpenter"}.issubset(
        {item["id"] for item in data["room_worlds"]}
    )
    assert {"chamber_walk", "orbit_constellation", "object_tableau", "portal_cascade"}.issubset(
        {item["id"] for item in data["engagement_dynamics"]}
    )
    assert {"calm", "cinematic", "kinetic", "minimal", "ritual", "playful"} == {
        item["id"] for item in data["motion_profiles"]
    }


def test_customisation_recommendations_for_archetype_are_frontend_consumable():
    app = _build_app()
    client = app.test_client()

    response = client.get(
        "/api/presence/customisation/recommendations?archetype=artist",
        base_url="http://public.test",
    )

    assert response.status_code == 200, response.get_json()
    data = response.get_json()["data"]
    assert data["schema_version"] == "presence-customisation-manifest-v1"
    assert data["archetype"]["id"] == "artist"
    assert data["recommendations"][0]["room_world"] == "rooms-gallery-painter"
    assert data["recommendations"][0]["engagement_dynamic"] == "chamber_walk"


def test_public_setup_request_stores_versioned_customisation_snapshot():
    app = _build_app()
    client = app.test_client()

    response = client.post(
        "/api/presence/setup-requests",
        json={
            "display_name": "Signal Room",
            "email": "signal@example.com",
            "archetype": "dj",
            "room_world": "rooms-underground-dj",
            "engagement_dynamic": "portal_cascade",
            "motion_profile": "kinetic",
            "object_skin_pack": "signal_tile_pack",
            "atmosphere_pack": "nocturnal_signal",
        },
        base_url="http://public.test",
    )

    assert response.status_code == 201, response.get_json()
    body = response.get_json()["data"]
    assert body["customisation_manifest_version"] == "presence-customisation-manifest-v1"
    assert body["room_world"] == "rooms-underground-dj"
    assert body["engagement_dynamic"] == "portal_cascade"
    assert body["motion_profile"] == "kinetic"
    assert body["object_skin_pack"] == "signal_tile_pack"
    assert body["atmosphere_pack"] == "nocturnal_signal"
    assert body["customisation"]["resolved"]["room_world"] == "rooms-underground-dj"

    from manara_backend_app.extensions import db
    from manara_backend_app.models import PresenceBetaApplication

    with app.app_context():
        row = db.session.query(PresenceBetaApplication).one()
        assert row.room_world == "rooms-underground-dj"
        assert row.engagement_dynamic == "portal_cascade"
        assert row.motion_profile == "kinetic"
        assert row.object_skin_pack == "signal_tile_pack"
        assert row.atmosphere_pack == "nocturnal_signal"
        assert row.customisation_snapshot["schema_version"] == "presence-customisation-snapshot-v1"
        assert row.presence_dna["room_world"] == "rooms-underground-dj"
        assert row.room_graph["roomWorld"] == "rooms-underground-dj"


def test_public_setup_request_preserves_studio_intake_fields_in_metadata():
    app = _build_app()
    client = app.test_client()

    submitted_snapshot = {"client": "snapshot-for-field-preservation"}
    response = client.post(
        "/api/presence/setup-requests",
        json={
            "display_name": "Studio Intake",
            "contact_name": "Studio Contact",
            "email": "studio@example.com",
            "phone": "+61 400 000 000",
            "what_they_are_building": "A painter room with a quiet gallery feel.",
            "notes": "Needs a restrained proof shelf.",
            "references": [{"label": "Reference", "url": "https://example.com/reference"}],
            "do_not_wants": ["No neon", "No autoplay audio"],
            "consent_to_contact": True,
            "archetype": "artist",
            "room_world": "rooms-gallery-painter",
            "engagement_dynamic": "chamber_walk",
            "motion_profile": "calm",
            "object_skin_pack": "gallery_frame_pack",
            "atmosphere_pack": "quiet_gallery",
            "customisation_manifest_version": "presence-customisation-manifest-v1",
            "customisation_snapshot": submitted_snapshot,
        },
        base_url="http://public.test",
    )

    assert response.status_code == 201, response.get_json()
    from manara_backend_app.extensions import db
    from manara_backend_app.models import PresenceBetaApplication

    with app.app_context():
        row = db.session.query(PresenceBetaApplication).one()
        assert row.description == "A painter room with a quiet gallery feel."
        assert row.notes == "Needs a restrained proof shelf."
        assert row.links == [{"label": "Reference", "url": "https://example.com/reference"}]
        studio_intake = row.metadata_json["studio_intake"]
        assert studio_intake["phone"] == "+61 400 000 000"
        assert studio_intake["what_they_are_building"] == "A painter room with a quiet gallery feel."
        assert studio_intake["do_not_wants"] == ["No neon", "No autoplay audio"]
        assert studio_intake["references"] == [{"label": "Reference", "url": "https://example.com/reference"}]
        assert studio_intake["consent_to_contact"] is True
        assert studio_intake["submitted_customisation_manifest_version"] == "presence-customisation-manifest-v1"
        assert studio_intake["submitted_customisation_snapshot"] == submitted_snapshot
        assert row.customisation_snapshot["resolved"]["room_world"] == "rooms-gallery-painter"


def test_public_setup_request_accepts_actual_presence_studio_payload_shape():
    app = _build_app()
    client = app.test_client()

    response = client.post(
        "/api/presence/setup-requests",
        json={
            "display_name": "Studio Levy",
            "contact_name": "Anouk Levy",
            "email": "anouk@example.com",
            "phone": "+61 400 000 000",
            "what_youre_building": "A quiet gallery for watercolours and small commissions.",
            "notes": "Keep the room quiet and image-led.",
            "references": ["https://example.com/reference-one", "https://example.com/reference-two"],
            "do_not_wants": "No autoplay audio or loud animation.",
            "consent_to_contact": True,
            "archetype": "artist",
            "room_world": "rooms-gallery-painter",
            "engagement_dynamic": "chamber_walk",
            "motion_profile": "still",
            "object_skin_pack": "paper-wall",
            "atmosphere_pack": "north-light",
            "contact_style": "enquiry",
            "copy_tone": "Plain",
            "customisation_manifest_version": "studio-v1-local-fallback",
            "customisation_snapshot": {
                "identity": {"id": "artist", "label": "Artist"},
                "world": {"id": "gallery", "label": "The Quiet Gallery"},
                "movement": {"id": "rooms", "label": "Walk the Rooms"},
                "mood": {"id": "north-light", "label": "North Light"},
                "pace": {"id": "still", "label": "Still"},
                "material": {"id": "paper-wall", "label": "Paper & Wall"},
                "contact": {"id": "enquiry", "label": "Open Enquiry"},
                "tone": "Plain",
            },
        },
        base_url="http://public.test",
    )

    assert response.status_code == 201, response.get_json()
    body = response.get_json()["data"]
    assert body["room_world"] == "rooms-gallery-painter"
    assert body["motion_profile"] == "calm"
    assert body["object_skin_pack"] == "gallery_frame_pack"
    assert body["atmosphere_pack"] == "quiet_gallery"
    assert body["customisation"]["selected_raw"]["motion_profile"] == "still"
    assert body["customisation"]["selected_raw"]["object_skin_pack"] == "paper-wall"
    assert body["customisation"]["selected_raw"]["atmosphere_pack"] == "north-light"

    from manara_backend_app.extensions import db
    from manara_backend_app.models import PresenceBetaApplication

    with app.app_context():
        row = db.session.query(PresenceBetaApplication).one()
        assert row.description == "A quiet gallery for watercolours and small commissions."
        assert row.links == ["https://example.com/reference-one", "https://example.com/reference-two"]
        studio_intake = row.metadata_json["studio_intake"]
        assert studio_intake["what_they_are_building"] == "A quiet gallery for watercolours and small commissions."
        assert studio_intake["do_not_wants"] == ["No autoplay audio or loud animation."]
        assert studio_intake["contact_style"] == "enquiry"
        assert studio_intake["copy_tone"] == "Plain"
        assert studio_intake["submitted_customisation_manifest_version"] == "studio-v1-local-fallback"
        assert studio_intake["submitted_customisation_snapshot"]["world"]["label"] == "The Quiet Gallery"


def test_public_setup_request_rejects_invalid_customisation_combination():
    app = _build_app()
    client = app.test_client()

    response = client.post(
        "/api/presence/setup-requests",
        json={
            "display_name": "Wrong Fit",
            "email": "wrong@example.com",
            "archetype": "dj",
            "room_world": "rooms-material-carpenter",
            "object_skin_pack": "gallery_frame_pack",
        },
        base_url="http://public.test",
    )

    assert response.status_code == 422
    body = response.get_json()
    assert body["ok"] is False
    assert body["error"]["code"] == "validation_error"
    details = body["error"]["details"]
    assert any(item["field"] == "room_world" for item in details["errors"])
    assert details["correction_hints"]


def test_public_setup_request_rejects_archetype_incompatible_dynamic():
    app = _build_app()
    client = app.test_client()

    response = client.post(
        "/api/presence/setup-requests",
        json={
            "display_name": "Overdone Local Room",
            "email": "local@example.com",
            "archetype": "local_business",
            "room_world": "rooms-material-carpenter",
            "engagement_dynamic": "portal_cascade",
        },
        base_url="http://public.test",
    )

    assert response.status_code == 422
    details = response.get_json()["error"]["details"]
    assert any(item["field"] == "engagement_dynamic" for item in details["errors"])
    assert details["snapshot"]["resolved"]["room_world"] == "rooms-material-carpenter"


def test_preview_seed_uses_stored_customisation_snapshot_and_old_requests_default_safely():
    app = _build_app()
    client = app.test_client()

    response = client.post(
        "/api/presence/setup-requests",
        json={
            "display_name": "Gallery Request",
            "email": "gallery@example.com",
            "archetype": "artist",
            "room_world": "rooms-gallery-painter",
        },
        base_url="http://public.test",
    )
    assert response.status_code == 201

    from manara_backend_app.extensions import db
    from manara_backend_app.models import PresenceBetaApplication
    from manara_backend_app.services.presence_customisation_manifest import preview_seed_from_setup_request

    with app.app_context():
        row = db.session.query(PresenceBetaApplication).one()
        row.room_world = "rooms-material-carpenter"
        seed = preview_seed_from_setup_request(row)
        assert seed["needs_review"] is False
        assert seed["selected_room_world"] == "rooms-gallery-painter"
        assert seed["room_graph"]["roomWorld"] == "rooms-gallery-painter"

        old_row = PresenceBetaApplication(display_name="Legacy", email="legacy@example.com")
        old_seed = preview_seed_from_setup_request(old_row)
        assert old_seed["needs_review"] is False
        assert old_seed["selected_room_world"] == "rooms-material-carpenter"
        assert old_seed["customisation_snapshot"]["resolved"]["archetype"] == "local_business"


def test_preview_seed_endpoint_returns_safe_roomgraph_seed():
    app = _build_app()
    client = app.test_client()

    response = client.post(
        "/api/presence/customisation/preview-seed",
        json={"archetype": "maker", "room_world": "rooms-material-carpenter"},
        base_url="http://public.test",
    )

    assert response.status_code == 200, response.get_json()
    seed = response.get_json()["data"]
    assert seed["schema_version"] == "presence-roomgraph-preview-seed-v1"
    assert seed["room_graph"]["schemaVersion"] == "presence-roomgraph-v1"
    assert seed["room_graph"]["roomWorld"] == "rooms-material-carpenter"
    assert seed["presence_dna"]["object_skin_pack"] == "material_studio_pack"
