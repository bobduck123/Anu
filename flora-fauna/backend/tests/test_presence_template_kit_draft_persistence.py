import json
import os
from datetime import timedelta

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-template-kit-drafts"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-template-kit-drafts"

from flask_jwt_extended import create_access_token  # noqa: E402

from backend_factory import load_create_app  # noqa: E402


PRIMARY_TEMPLATE_KIT_IDS = [
    "gallery-artist",
    "cultural-community-artist",
    "material-tradie-proof-card",
    "healing-practitioner",
    "consultant-contractor",
]


def _build_app():
    create_app = load_create_app()
    return create_app(
        {
            "TESTING": True,
            "FLASK_ENV": "production",
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
            "CONTROL_REQUIRE_TOKEN_GRANT": False,
            "RATELIMIT_ENABLED": False,
        }
    )


def _headers(app, username, role="participant"):
    with app.app_context():
        token = create_access_token(
            identity=username,
            additional_claims={
                "aud": "public",
                "token_use": "public",
                "role": role,
                "username": username,
            },
            expires_delta=timedelta(minutes=30),
        )
    return {"Authorization": f"Bearer {token}"}


def _seed(app):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, User

    with app.app_context():
        tenant = Node(name="TemplateKit Tenant", slug="template-kit-tenant", status="active")
        owner = User(username="kit-owner", pseudonym="Kit Owner", email="owner@example.com", password="hash", role="participant")
        other = User(username="other-owner", pseudonym="Other Owner", email="other@example.com", password="hash", role="participant")
        db.session.add_all([tenant, owner, other])
        db.session.flush()
        owner.node_id = tenant.id
        other.node_id = tenant.id
        db.session.commit()
        return {"tenant_id": tenant.id, "owner_id": owner.id, "other_id": other.id}


def _studio_room_payload(kit_id="cultural-community-artist"):
    return {
        "schemaVersion": "presence-studio-room-v1",
        "templateKitId": kit_id,
        "persistenceBoundary": "staged-only",
        "room": {
            "schemaVersion": "presence-studio-room-v1",
            "id": f"starter:{kit_id}",
            "slug": f"starter-{kit_id}",
            "title": "Untitled Studio Room",
            "state": "draft",
            "entryChamberId": "threshold",
            "templateKitId": kit_id,
            "theme": {
                "background": "#f8f1e8",
                "surface": "#fffaf2",
                "text": "#211b17",
                "muted": "#705f56",
                "accent": "#8f3a2f",
                "radius": "soft",
                "fontHeading": "Georgia, Times New Roman, serif",
                "fontBody": "Inter, Helvetica Neue, Arial, sans-serif",
                "motion": "gentle",
                "spacing": "comfortable",
            },
            "rendererConfig": {
                "renderer": "studio-room-basic",
                "layout": "single-scroll",
                "mobileLayout": "stacked",
                "reducedMotion": True,
                "objectOpenMode": "sheet",
            },
            "moodPresetId": "cultural-archive",
            "chambers": [
                {
                    "id": "threshold",
                    "type": "threshold",
                    "title": "Archive Threshold",
                    "summary": "Sets public context for the room.",
                    "mobile": {"order": 1, "layout": "stack"},
                    "objects": [
                        {
                            "id": "threshold-story",
                            "type": "headline",
                            "label": "Public story",
                            "required": True,
                            "mobile": {"order": 1},
                            "content": {
                                "title": "Untitled Cultural-Community Artist / Practice Archive room",
                                "body": "Add the story, public purpose, and place context for this room.",
                            },
                        },
                        {
                            "id": "template-primary-cta",
                            "type": "cta",
                            "label": "Primary invitation",
                            "required": True,
                            "mobile": {"order": 2},
                            "content": {
                                "title": "Invite a practice archive conversation",
                                "body": "Visitors will not see this until the room is published.",
                                "action": {"label": "Invite a practice archive conversation", "href": "#contact"},
                            },
                        },
                    ],
                },
                {
                    "id": "services",
                    "type": "services",
                    "title": "Programs / Services",
                    "summary": "Safe editable object examples.",
                    "mobile": {"order": 2, "layout": "stack"},
                    "objects": [
                        {
                            "id": "service-card",
                            "type": "service-card",
                            "label": "Service",
                            "required": False,
                            "mobile": {"order": 1},
                            "content": {
                                "title": "Service 1",
                                "body": "Describe this offer.",
                                "priceLabel": "By quote",
                                "durationLabel": "Project-based",
                            },
                        },
                        {
                            "id": "proof-card",
                            "type": "proof-card",
                            "label": "Proof",
                            "required": False,
                            "mobile": {"order": 2},
                            "content": {
                                "title": "Proof 1",
                                "body": "Add a public outcome.",
                                "quote": "Public quote placeholder.",
                                "attribution": "Public partner",
                                "source": "Public record",
                            },
                        },
                        {
                            "id": "link-card",
                            "type": "link-card",
                            "label": "Public link",
                            "required": False,
                            "mobile": {"order": 3},
                            "content": {
                                "title": "Public link",
                                "body": "Add a public link.",
                                "action": {"label": "Open public link", "href": "https://example.org/archive"},
                                "linkType": "archive",
                            },
                        },
                        {
                            "id": "credential-card",
                            "type": "credential",
                            "label": "Credential",
                            "required": False,
                            "mobile": {"order": 4},
                            "content": {
                                "title": "Credential",
                                "body": "Add a public credential.",
                                "issuer": "Public issuer",
                                "detail": "Public detail",
                            },
                        },
                    ],
                },
                {
                    "id": "contact",
                    "type": "contact",
                    "title": "Contact / Invitation",
                    "summary": "Public invitation path.",
                    "mobile": {"order": 3, "layout": "compact"},
                    "objects": [
                        {
                            "id": "contact-public",
                            "type": "contact",
                            "label": "Public contact",
                            "required": False,
                            "mobile": {"order": 1},
                            "content": {
                                "title": "Public contact",
                                "body": "Add explicitly public contact details in Studio before publishing.",
                            },
                        }
                    ],
                },
            ],
        },
        "requiredFields": ["hero_title", "practice_statement", "archive_items"],
        "optionalFields": ["partner_links", "public_credentials"],
        "copyScaffolds": [
            {
                "field": "hero_title",
                "label": "Room title",
                "placeholder": "Untitled Cultural-Community Artist / Practice Archive room",
                "required": True,
            },
            {
                "field": "practice_statement",
                "label": "Practice statement",
                "placeholder": "Describe the public cultural/community practice.",
                "required": True,
            },
        ],
        "ctaStrategy": {
            "label": "Invite a practice archive conversation",
            "target": "contact",
            "primaryChamberId": "contact",
            "appearsEarlyOnMobile": True,
        },
    }


def _create_persisted_draft(app, client, kit_id="cultural-community-artist"):
    response = client.post(
        "/api/presence/owner/studio-rooms/from-template-kit",
        json={"kit_id": kit_id, "draft_payload": _studio_room_payload(kit_id)},
        headers=_headers(app, "kit-owner"),
        base_url="http://public.test",
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()["data"]


def _load_studio_room_draft(app, client, room_id, username="kit-owner"):
    response = client.get(
        f"/api/presence/owner/rooms/{room_id}/editor",
        headers=_headers(app, username),
        base_url="http://public.test",
    )
    assert response.status_code == 200, response.get_json()
    return response.get_json()["data"]["draft"]["content_config"]["studio_room_draft"]


def test_backend_template_kit_contract_defines_owner_creatable_and_candidate_policy():
    _build_app()

    from manara_backend_app.services.presence_template_kit_drafts import (
        owner_creatable_template_kit_ids,
        template_kit_contract_summary,
    )

    summary = template_kit_contract_summary()
    assert summary["schema_version"] == "presence-studio-template-kit-contract-v1"
    assert summary["studio_room_schema_version"] == "presence-studio-room-v1"
    assert owner_creatable_template_kit_ids() == PRIMARY_TEMPLATE_KIT_IDS
    assert summary["primary_ids"] == PRIMARY_TEMPLATE_KIT_IDS
    assert summary["candidate_ids"] == ["underground-dj-portal"]
    assert summary["deferred_ids"] == []
    assert summary["non_owner_creatable_ids"] == ["underground-dj-portal"]

    by_id = {kit["id"]: kit for kit in summary["kits"]}
    assert set(by_id) == {*PRIMARY_TEMPLATE_KIT_IDS, "underground-dj-portal"}
    for kit_id in PRIMARY_TEMPLATE_KIT_IDS:
        assert by_id[kit_id]["support_state"] == "primary"
        assert by_id[kit_id]["owner_creatable"] is True
    assert by_id["underground-dj-portal"]["support_state"] == "candidate"
    assert by_id["underground-dj-portal"]["owner_creatable"] is False


def test_template_kit_start_requires_auth_and_rejects_candidate_kits():
    app = _build_app()
    _seed(app)
    client = app.test_client()
    endpoint = "/api/presence/owner/studio-rooms/from-template-kit"

    unauthenticated = client.post(
        endpoint,
        json={"kit_id": "gallery-artist", "draft_payload": _studio_room_payload("gallery-artist")},
        base_url="http://public.test",
    )
    assert unauthenticated.status_code == 401

    candidate = client.post(
        endpoint,
        json={"kit_id": "underground-dj-portal", "draft_payload": _studio_room_payload("underground-dj-portal")},
        headers=_headers(app, "kit-owner"),
        base_url="http://public.test",
    )
    assert candidate.status_code == 403, candidate.get_json()
    assert candidate.get_json()["error"]["code"] == "template_kit_not_owner_creatable"


def test_all_primary_template_kits_create_private_unpublished_drafts_from_contract():
    app = _build_app()
    _seed(app)
    client = app.test_client()

    from manara_backend_app.models import PresenceEditableConfig, PresenceNode
    from manara_backend_app.services.presence_template_kit_drafts import owner_creatable_template_kit_ids

    for kit_id in owner_creatable_template_kit_ids():
        created = _create_persisted_draft(app, client, kit_id)
        assert created["template_kit_id"] == kit_id
        assert created["support_state"] == "primary"
        assert created["status"] == "draft"
        assert created["visibility"] == "private"
        assert created["public_status"] == "draft"
        assert created["published"] is None
        assert created["published_at"] is None
        assert created["editor_path"] == f"/studio/{created['room_id']}/studio-room"

        loaded = _load_studio_room_draft(app, client, created["room_id"])
        assert loaded["template_kit_id"] == kit_id
        assert loaded["support_state"] == "primary"
        assert loaded["published_state"] is None
        assert loaded["room"]["state"] == "draft"

        with app.app_context():
            node = PresenceNode.query.get(created["room_id"])
            assert node.status == "draft"
            assert node.visibility == "private"
            assert node.public_status == "draft"
            assert node.published_at is None
            assert PresenceEditableConfig.query.filter_by(room_id=node.id, status="published").first() is None

        public = client.get(f"/api/presence/public/{created['slug']}", base_url="http://public.test")
        assert public.status_code == 404


def test_primary_template_kit_start_creates_owner_private_unpublished_studio_room_draft():
    app = _build_app()
    ids = _seed(app)
    client = app.test_client()

    response = client.post(
        "/api/presence/owner/studio-rooms/from-template-kit",
        json={
            "kit_id": "cultural-community-artist",
            "draft_payload": _studio_room_payload("cultural-community-artist"),
        },
        headers=_headers(app, "kit-owner"),
        base_url="http://public.test",
    )
    assert response.status_code == 201, response.get_json()
    body = response.get_json()["data"]
    assert body["template_kit_id"] == "cultural-community-artist"
    assert body["support_state"] == "primary"
    assert body["status"] == "draft"
    assert body["visibility"] == "private"
    assert body["published"] is None
    assert body["published_at"] is None
    assert body["base_published_version"] == 0
    assert body["editor_path"] == f"/studio/{body['room_id']}/studio-room"
    assert body["chamber_count"] == 3
    assert body["object_count"] == 7
    assert body["mobile_variant_count"] >= 3

    from manara_backend_app.services.presence_editor_config import serialize_public_editable_config
    from manara_backend_app.models import PresenceEditableConfig, PresenceNode

    with app.app_context():
        node = PresenceNode.query.get(body["room_id"])
        assert node is not None
        assert node.owner_user_id == ids["owner_id"]
        assert node.status == "draft"
        assert node.visibility == "private"
        assert node.public_status == "draft"
        assert node.published_at is None
        assert node.node_metadata["studio_room_template"]["kit_id"] == "cultural-community-artist"

        draft = PresenceEditableConfig.query.filter_by(room_id=node.id, status="draft").one()
        assert draft.renderer_key == "studio-room-template-kit-v1"
        assert PresenceEditableConfig.query.filter_by(room_id=node.id, status="published").first() is None
        stored = draft.content_config_json["studio_room_draft"]
        assert stored["contract"] == "presence-editable-config-compat-v1"
        assert stored["base_published_version"] == 0
        assert stored["published_state"] is None
        assert stored["room"]["schemaVersion"] == "presence-studio-room-v1"
        assert stored["room"]["state"] == "draft"
        assert stored["room"]["theme"]["accent"] == "#8f3a2f"
        assert stored["room"]["moodPresetId"] == "cultural-archive"
        assert len(stored["room"]["chambers"]) == 3
        assert stored["cta_strategy"]["label"] == "Invite a practice archive conversation"
        assert stored["required_fields"] == ["hero_title", "practice_statement", "archive_items"]
        assert stored["optional_fields"] == ["partner_links", "public_credentials"]
        assert len(stored["copy_scaffolds"]) == 2

        serialized = json.dumps(stored).lower()
        for restricted in (
            "editoronly",
            "editable_config",
            "style_dna",
            "motion_config",
            "contactemail",
            "contactphone",
            "owneremail",
            "authsubject",
            "christina",
            "kerkvliet",
            "goddard",
        ):
            assert restricted not in serialized

        public_config = serialize_public_editable_config(draft)
        assert public_config is not None
        assert "studio_room_draft" not in public_config["content_config"]
        public_serialized = json.dumps(public_config).lower()
        assert "editoronly" not in public_serialized
        assert "editable_config" not in public_serialized
        assert "contactemail" not in public_serialized

    public = client.get(f"/api/presence/public/{body['slug']}", base_url="http://public.test")
    assert public.status_code == 404

    owner_editor = client.get(
        f"/api/presence/owner/rooms/{body['room_id']}/editor",
        headers=_headers(app, "kit-owner"),
        base_url="http://public.test",
    )
    assert owner_editor.status_code == 200, owner_editor.get_json()
    editor_body = owner_editor.get_json()["data"]
    assert editor_body["draft"]["status"] == "draft"
    assert editor_body["published"] is None
    assert editor_body["draft"]["content_config"]["studio_room_draft"]["template_kit_id"] == "cultural-community-artist"

    other_editor = client.get(
        f"/api/presence/owner/rooms/{body['room_id']}/editor",
        headers=_headers(app, "other-owner"),
        base_url="http://public.test",
    )
    assert other_editor.status_code == 403


def test_owner_can_save_allowed_studio_room_chamber_object_edits_without_publish():
    app = _build_app()
    _seed(app)
    client = app.test_client()
    created = _create_persisted_draft(app, client)
    draft = _load_studio_room_draft(app, client, created["room_id"])

    draft["room"]["chambers"][0]["title"] = "Updated archive threshold"
    draft["room"]["chambers"][0]["summary"] = "Updated public context."
    draft["room"]["chambers"][0]["objects"][0]["label"] = "Updated story object"
    draft["room"]["chambers"][0]["objects"][0]["content"]["title"] = "Updated public story"
    draft["room"]["chambers"][0]["objects"][0]["content"]["body"] = "Updated practice-led story copy."

    response = client.patch(
        f"/api/presence/owner/studio-rooms/{created['room_id']}/draft",
        json={"studio_room_draft": draft},
        headers=_headers(app, "kit-owner"),
        base_url="http://public.test",
    )
    assert response.status_code == 200, response.get_json()
    body = response.get_json()["data"]
    assert body["status"] == "draft"
    assert body["visibility"] == "private"
    assert body["public_status"] == "draft"
    assert body["published"] is None
    assert body["published_config_present"] is False
    saved = body["studio_room_draft"]
    assert saved["room"]["chambers"][0]["title"] == "Updated archive threshold"
    assert saved["room"]["chambers"][0]["objects"][0]["content"]["title"] == "Updated public story"

    from manara_backend_app.models import PresenceEditableConfig, PresenceNode

    with app.app_context():
        node = PresenceNode.query.get(created["room_id"])
        assert node.status == "draft"
        assert node.visibility == "private"
        assert node.public_status == "draft"
        assert node.published_at is None
        assert PresenceEditableConfig.query.filter_by(room_id=node.id, status="published").first() is None
        stored = PresenceEditableConfig.query.filter_by(room_id=node.id, status="draft").one()
        assert stored.content_config_json["studio_room_draft"]["room"]["chambers"][0]["summary"] == "Updated public context."

    public = client.get(f"/api/presence/public/{created['slug']}", base_url="http://public.test")
    assert public.status_code == 404


def test_owner_lifecycle_smoke_create_edit_save_reload_and_public_remains_hidden():
    app = _build_app()
    _seed(app)
    client = app.test_client()
    created = _create_persisted_draft(app, client, "gallery-artist")
    draft = _load_studio_room_draft(app, client, created["room_id"])

    draft["room"]["chambers"][0]["objects"][0]["content"]["title"] = "Lifecycle proof title"
    draft["room"]["chambers"][0]["objects"][0]["content"]["body"] = "A safe owner edit persisted through the draft lifecycle."

    response = client.patch(
        f"/api/presence/owner/studio-rooms/{created['room_id']}/draft",
        json={"studio_room_draft": draft},
        headers=_headers(app, "kit-owner"),
        base_url="http://public.test",
    )
    assert response.status_code == 200, response.get_json()
    body = response.get_json()["data"]
    assert body["status"] == "draft"
    assert body["visibility"] == "private"
    assert body["public_status"] == "draft"
    assert body["published"] is None
    assert body["published_config_present"] is False

    reloaded = _load_studio_room_draft(app, client, created["room_id"])
    assert reloaded["room"]["chambers"][0]["objects"][0]["content"]["title"] == "Lifecycle proof title"
    assert reloaded["room"]["chambers"][0]["objects"][0]["content"]["body"] == "A safe owner edit persisted through the draft lifecycle."

    from manara_backend_app.models import PresenceEditableConfig, PresenceNode

    with app.app_context():
        node = PresenceNode.query.get(created["room_id"])
        assert node.status == "draft"
        assert node.visibility == "private"
        assert node.public_status == "draft"
        assert node.published_at is None
        assert PresenceEditableConfig.query.filter_by(room_id=node.id, status="published").first() is None

    public = client.get(f"/api/presence/public/{created['slug']}", base_url="http://public.test")
    assert public.status_code == 404


def test_owner_can_save_allowed_service_proof_link_credential_and_cta_edits():
    app = _build_app()
    _seed(app)
    client = app.test_client()
    created = _create_persisted_draft(app, client)
    draft = _load_studio_room_draft(app, client, created["room_id"])
    service, proof, link, credential = draft["room"]["chambers"][1]["objects"]
    cta = draft["room"]["chambers"][0]["objects"][1]

    service["content"]["title"] = "Archive conversation"
    service["content"]["priceLabel"] = "Scoped proposal"
    service["content"]["durationLabel"] = "2 sessions"
    proof["content"]["quote"] = "Public proof update."
    proof["content"]["attribution"] = "Community partner"
    proof["content"]["source"] = "Published program note"
    link["content"]["action"]["label"] = "Open project record"
    link["content"]["action"]["href"] = "https://example.org/project-record"
    link["content"]["linkType"] = "project-record"
    credential["content"]["issuer"] = "Public institution"
    credential["content"]["detail"] = "Public award detail"
    cta["content"]["action"]["label"] = "Start a collaboration conversation"
    cta["content"]["action"]["href"] = "#contact"
    draft["cta_strategy"]["label"] = "Start a collaboration conversation"
    draft["cta_strategy"]["primaryChamberId"] = "contact"

    response = client.patch(
        f"/api/presence/owner/studio-rooms/{created['room_id']}/draft",
        json={"studio_room_draft": draft},
        headers=_headers(app, "kit-owner"),
        base_url="http://public.test",
    )
    assert response.status_code == 200, response.get_json()
    saved = response.get_json()["data"]["studio_room_draft"]
    service, proof, link, credential = saved["room"]["chambers"][1]["objects"]
    assert service["content"]["priceLabel"] == "Scoped proposal"
    assert proof["content"]["attribution"] == "Community partner"
    assert link["content"]["action"]["href"] == "https://example.org/project-record"
    assert credential["content"]["detail"] == "Public award detail"
    assert saved["cta_strategy"]["label"] == "Start a collaboration conversation"
    assert response.get_json()["data"]["published_config_present"] is False


def test_studio_room_draft_save_rejects_auth_cross_owner_unsafe_url_and_restricted_fields():
    app = _build_app()
    _seed(app)
    client = app.test_client()
    created = _create_persisted_draft(app, client)
    draft = _load_studio_room_draft(app, client, created["room_id"])
    endpoint = f"/api/presence/owner/studio-rooms/{created['room_id']}/draft"

    unauthenticated = client.patch(endpoint, json={"studio_room_draft": draft}, base_url="http://public.test")
    assert unauthenticated.status_code == 401

    cross_owner = client.patch(
        endpoint,
        json={"studio_room_draft": draft},
        headers=_headers(app, "other-owner"),
        base_url="http://public.test",
    )
    assert cross_owner.status_code == 403

    unsafe = json.loads(json.dumps(draft))
    unsafe["room"]["chambers"][1]["objects"][2]["content"]["action"]["href"] = "http://localhost:3000/internal"
    unsafe_response = client.patch(
        endpoint,
        json={"studio_room_draft": unsafe},
        headers=_headers(app, "kit-owner"),
        base_url="http://public.test",
    )
    assert unsafe_response.status_code == 422, unsafe_response.get_json()
    assert "localhost" in unsafe_response.get_json()["error"]["message"]

    restricted = json.loads(json.dumps(draft))
    restricted["room"]["chambers"][0]["objects"][0]["editorOnly"] = {"notes": "do not store"}
    restricted_response = client.patch(
        endpoint,
        json={"studio_room_draft": restricted},
        headers=_headers(app, "kit-owner"),
        base_url="http://public.test",
    )
    assert restricted_response.status_code == 422, restricted_response.get_json()
    assert restricted_response.get_json()["error"]["code"] == "validation_error"

    broad_contact = json.loads(json.dumps(draft))
    broad_contact["room"]["chambers"][2]["objects"][0]["content"]["contactEmail"] = "private@example.invalid"
    contact_response = client.patch(
        endpoint,
        json={"studio_room_draft": broad_contact},
        headers=_headers(app, "kit-owner"),
        base_url="http://public.test",
    )
    assert contact_response.status_code == 422, contact_response.get_json()

    locked = json.loads(json.dumps(draft))
    locked["room"]["theme"]["accent"] = "#000000"
    locked_response = client.patch(
        endpoint,
        json={"studio_room_draft": locked},
        headers=_headers(app, "kit-owner"),
        base_url="http://public.test",
    )
    assert locked_response.status_code == 422, locked_response.get_json()
    assert "locked room field" in locked_response.get_json()["error"]["message"]


def test_template_kit_start_rejects_broad_contact_fields_and_unsafe_urls():
    app = _build_app()
    _seed(app)
    client = app.test_client()
    endpoint = "/api/presence/owner/studio-rooms/from-template-kit"
    headers = _headers(app, "kit-owner")

    broad_contact = _studio_room_payload("gallery-artist")
    broad_contact["room"]["chambers"][1]["objects"][0]["content"]["email"] = "private@example.invalid"
    contact_response = client.post(
        endpoint,
        json={"kit_id": "gallery-artist", "draft_payload": broad_contact},
        headers=headers,
        base_url="http://public.test",
    )
    assert contact_response.status_code == 422, contact_response.get_json()
    assert contact_response.get_json()["error"]["code"] == "validation_error"

    unsafe_url = _studio_room_payload("gallery-artist")
    unsafe_url["room"]["chambers"][0]["objects"][1]["content"]["action"]["href"] = "http://localhost:3000/studio"
    unsafe_response = client.post(
        endpoint,
        json={"kit_id": "gallery-artist", "draft_payload": unsafe_url},
        headers=headers,
        base_url="http://public.test",
    )
    assert unsafe_response.status_code == 422, unsafe_response.get_json()
    assert "localhost" in unsafe_response.get_json()["error"]["message"]
