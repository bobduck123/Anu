import os
import io
from datetime import timedelta

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-presence-nodes-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-presence-nodes-1234"

from flask_jwt_extended import create_access_token  # noqa: E402

from backend_factory import load_create_app  # noqa: E402


CONTROL_SECRET = "presence-control-secret"
PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


PRESENCE_SCOPES = [
    "presence.node.create",
    "presence.node.read",
    "presence.node.update",
    "presence.node.delete",
    "presence.node.publish",
    "presence.node.suspend",
    "presence.node.archive",
    "presence.enquiry.read",
    "presence.enquiry.update",
    "presence.template.manage",
    "presence.analytics.read",
    "presence.organisation.manage",
    "presence.collection.manage",
    "presence.work.manage",
    "presence.service.manage",
    "presence.proof.manage",
    "presence.procurement.manage",
    "presence.nfc.manage",
    "presence.connection.read",
    "presence.connection.update",
    "presence.quote.manage",
    "presence.variation.manage",
    "presence.handover.manage",
]


def _build_app():
    create_app = load_create_app()
    return create_app(
        {
            "TESTING": True,
            "FLASK_ENV": "production",
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
            "CONTROL_PLANE_HOSTS": ["control.test"],
            "CONTROL_PLANE_SHARED_SECRET": CONTROL_SECRET,
            "CONTROL_PLANE_ALLOWED_ROLES": ["platform_admin", "node_admin"],
            "CONTROL_REQUIRE_TOKEN_GRANT": False,
            "CONTROL_PLANE_JWT_AUDIENCE": "control",
        }
    )


def _seed_fixture(app):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, NodeConfig, User

    with app.app_context():
        node_a = Node(name="Tenant A", slug="tenant-a", status="active")
        node_b = Node(name="Tenant B", slug="tenant-b", status="active")
        platform = User(
            username="platform-admin",
            pseudonym="Platform Admin",
            email="platform-admin@example.com",
            password="hash",
            role="platform_admin",
        )
        operator = User(
            username="node-admin",
            pseudonym="Node Admin",
            email="node-admin@example.com",
            password="hash",
            role="node_admin",
        )
        db.session.add_all([node_a, node_b, platform, operator])
        db.session.flush()
        operator.node_id = node_a.id
        db.session.add(NodeConfig(node_id=node_a.id, config_json={"control_operator_usernames": ["node-admin"]}))
        db.session.add(NodeConfig(node_id=node_b.id, config_json={}))
        db.session.commit()
        return node_a.id, node_b.id


def _headers(app, username="platform-admin", role="platform_admin", *, node_id=None, scopes=None, secret=CONTROL_SECRET):
    with app.app_context():
        claims = {
            "aud": "control",
            "token_use": "control",
            "requires_mfa": True,
            "role": role,
            "scp": scopes or PRESENCE_SCOPES,
        }
        if node_id is not None:
            claims["node_id"] = node_id
        token = create_access_token(
            identity=f"control::{username}",
            additional_claims=claims,
            expires_delta=timedelta(minutes=30),
        )
    return {"Authorization": f"Bearer {token}", "X-Control-Plane-Secret": secret}


def _owner_headers(app, username="node-admin", role="node_admin"):
    with app.app_context():
        token = create_access_token(
            identity=username,
            additional_claims={
                "aud": "public",
                "token_use": "public",
                "requires_mfa": False,
                "role": role,
                "username": username,
            },
            expires_delta=timedelta(minutes=30),
        )
    return {"Authorization": f"Bearer {token}"}


def _supabase_owner_headers(
    app,
    *,
    sub="supabase-owner-1",
    email="owner@example.com",
    display_name="Presence Owner",
    extra_claims=None,
):
    claims = {
        "aud": "public",
        "token_use": "public",
        "requires_mfa": False,
        "role": "authenticated",
        "email": email,
        "user_metadata": {
            "display_name": display_name,
            "name": display_name,
        },
        "app_metadata": {
            "provider": "email",
        },
    }
    if extra_claims:
        claims.update(extra_claims)
    with app.app_context():
        token = create_access_token(
            identity=sub,
            additional_claims=claims,
            expires_delta=timedelta(minutes=30),
        )
    return {"Authorization": f"Bearer {token}"}


def _create_owner_user(app, *, username, pseudonym, email, node_id, role="node_admin"):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import User

    with app.app_context():
        user = User(
            username=username,
            pseudonym=pseudonym,
            email=email,
            password="hash",
            role=role,
            node_id=node_id,
            points=0,
            level=1,
            points_to_level_up=100,
        )
        db.session.add(user)
        db.session.commit()
        return user.id


def _create_presence_node_for_owner(client, headers, tenant_id, owner_user_id, *, slug, display_name, extra=None):
    response = client.post(
        "/api/control/presence/nodes",
        json={
            **_node_payload(tenant_id, slug=slug),
            "owner_user_id": owner_user_id,
            "display_name": display_name,
            **(extra or {}),
        },
        headers=headers,
        base_url="http://control.test",
    )
    assert response.status_code == 201
    return response.get_json()["data"]


def _upload_image(client, *, node_id, headers=None, target_type="profile_image", filename="presence.png", content=PNG_BYTES, extra=None):
    data = {
        "target_type": target_type,
        "file": (io.BytesIO(content), filename),
        **(extra or {}),
    }
    return client.post(
        f"/api/presence/owner/nodes/{node_id}/media",
        data=data,
        headers=headers or {},
        base_url="http://public.test",
        content_type="multipart/form-data",
    )


def _patch_presence_media_store(monkeypatch):
    from manara_backend_app.api import presence_owner as owner_api
    from manara_backend_app.services.presence_media_storage import StoredPresenceMedia

    def fake_store(file, *, storage_path):
        return StoredPresenceMedia(
            url=f"https://media.test/{storage_path}",
            storage_path=storage_path,
            backend="test",
            content_type="image/png",
            size=len(PNG_BYTES),
        )

    monkeypatch.setattr(owner_api, "store_presence_image", fake_store)


def _node_payload(tenant_id, slug="river-practitioner"):
    return {
        "tenant_id": tenant_id,
        "organisation_id": tenant_id,
        "slug": slug,
        "display_name": "River Stone",
        "headline": "Trauma-informed practitioner",
        "bio": "<b>Gentle care</b> for community members.",
        "node_type": "practitioner",
        "display_mode": "practitioner_profile",
        "plan_type": "premium",
        "visibility": "public",
        "practice_statement": "Practice is consent-led and community-aware.",
        "business_functions_enabled": True,
        "directory_ready": True,
        "map_ready": True,
        "profile_image_url": "https://example.org/river.jpg",
        "cover_image_url": "https://example.org/cover.jpg",
        "location_label": "Sydney",
        "service_area": "Sydney and online",
        "public_email": "river@example.org",
        "public_phone": "+61 400 000 000",
        "links": [{"label": "Website", "url": "https://example.org", "link_type": "website"}],
        "services": [{"title": "Intro call", "description": "A short fit check.", "price_label": "Free"}],
        "portfolio_items": [
            {
                "title": "Studio work",
                "description": "A sample portfolio item.",
                "media_url": "https://example.org/work.jpg",
                "media_type": "image",
            }
        ],
        "availability_chips": [{"label": "Taking enquiries", "chip_type": "availability"}],
        "sections": [{"section_type": "about", "title": "About", "content": "Public-safe overview."}],
    }


def _create_artist_node_with_collection_and_work(client, headers, tenant_id, *, slug="detail-artist"):
    artist = client.post(
        "/api/control/presence/nodes",
        json={
            "tenant_id": tenant_id,
            "organisation_id": tenant_id,
            "slug": slug,
            "display_name": "Kira Stone",
            "headline": "Public art and selected works",
            "node_type": "artist",
            "display_mode": "artist_gallery",
            "plan_type": "artist_presence",
            "visibility": "public",
            "practice_statement": "Practice statement text.",
            "curatorial_statement": "Curatorial statement text.",
            "archive_ready": True,
            "marketplace_ready": True,
        },
        headers=headers,
        base_url="http://control.test",
    )
    assert artist.status_code == 201
    node_id = artist.get_json()["data"]["id"]

    collection_response = client.post(
        f"/api/control/presence/nodes/{node_id}/collections",
        json={
            "title": "Public Walls",
            "description": "Murals and participatory works.",
            "cover_image_url": "https://example.org/walls.jpg",
        },
        headers=headers,
        base_url="http://control.test",
    )
    assert collection_response.status_code == 201
    collection_id = collection_response.get_json()["data"]["id"]

    work_response = client.post(
        f"/api/control/presence/nodes/{node_id}/works",
        json={
            "collection_id": collection_id,
            "title": "River Memory Wall",
            "year": "2026",
            "medium": "Acrylic",
            "dimensions": "18m wall",
            "description": "A selected public work.",
            "image_url": "https://example.org/work.jpg",
            "availability_status": "commissioned",
        },
        headers=headers,
        base_url="http://control.test",
    )
    assert work_response.status_code == 201
    work_id = work_response.get_json()["data"]["id"]

    return {
        "node_id": node_id,
        "collection_id": collection_id,
        "work_id": work_id,
        "slug": slug,
    }


def _assert_owner_safe_node_detail_payload(
    data,
    *,
    expected_slug,
    expected_display_name,
    expected_status,
    expected_headline=None,
    expected_bio=None,
    expected_visual_mood=None,
    expected_profile_image_url=None,
    expected_cover_image_url=None,
    expected_practice_statement=None,
    expected_curatorial_statement=None,
):
    assert data["slug"] == expected_slug
    assert data["display_name"] == expected_display_name
    assert data["status"] == expected_status
    assert data["visibility"] == "public"
    assert "template_id" in data
    assert isinstance(data["theme_config"], dict)
    assert "analytics" in data
    assert isinstance(data["sections"], list)
    assert isinstance(data["links"], list)
    assert isinstance(data["services"], list)
    assert isinstance(data["collections"], list)
    assert isinstance(data["works"], list)
    assert isinstance(data["portfolio_items"], list)
    assert isinstance(data["availability_chips"], list)
    assert isinstance(data["business_functions"], list)
    assert data["public_url"].endswith(f"/p/{expected_slug}")

    if expected_headline is not None:
        assert data["headline"] == expected_headline
    if expected_bio is not None:
        assert data["bio"] == expected_bio
    if expected_visual_mood is not None:
        assert data["visual_mood"] == expected_visual_mood
    if expected_profile_image_url is not None:
        assert data["profile_image_url"] == expected_profile_image_url
    if expected_cover_image_url is not None:
        assert data["cover_image_url"] == expected_cover_image_url
    if expected_practice_statement is not None:
        assert data["practice_statement"] == expected_practice_statement
    if expected_curatorial_statement is not None:
        assert data["curatorial_statement"] == expected_curatorial_statement

    procurement = data.get("procurement_profile")
    if isinstance(procurement, dict):
        for key in ("node_id", "abn_acn_or_registration", "procurement_contact_email", "compliance_notes"):
            assert key not in procurement

    for key in (
        "owner_user_id",
        "tenant_id",
        "organisation_id",
        "organisation",
        "connections",
        "quotes",
        "variations",
        "invoice_support_records",
        "handovers",
        "nfc_tags",
    ):
        assert key not in data



def test_presence_node_create_edit_publish_public_enquiry_and_unpublish_flow():
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    headers = _headers(app)

    create_response = client.post(
        "/api/control/presence/nodes",
        json=_node_payload(tenant_id),
        headers=headers,
        base_url="http://control.test",
    )
    assert create_response.status_code == 201
    created = create_response.get_json()["data"]
    node_id = created["id"]
    assert created["status"] == "draft"
    assert created["owner_user_id"] is not None

    patch_response = client.patch(
        f"/api/control/presence/nodes/{node_id}",
        json={"headline": "Updated practitioner headline", "links": [{"label": "Booking", "url": "https://example.org/book"}]},
        headers=headers,
        base_url="http://control.test",
    )
    assert patch_response.status_code == 200
    assert patch_response.get_json()["data"]["headline"] == "Updated practitioner headline"
    assert patch_response.get_json()["data"]["links"][0]["label"] == "Booking"

    publish_response = client.post(
        f"/api/control/presence/nodes/{node_id}/publish",
        headers=headers,
        base_url="http://control.test",
    )
    assert publish_response.status_code == 200
    assert publish_response.get_json()["data"]["status"] == "published"

    public_response = client.get("/api/presence/public/river-practitioner", base_url="http://public.test")
    assert public_response.status_code == 200
    public_node = public_response.get_json()["data"]
    assert public_node["display_name"] == "River Stone"
    assert "owner_user_id" not in public_node
    assert public_node["links"][0]["label"] == "Booking"

    enquiry_response = client.post(
        "/api/presence/public/river-practitioner/enquiries",
        json={
            "name": "Ari Visitor",
            "email": "ari@example.org",
            "message": "I would like to book a session.",
            "preferred_contact_method": "email",
            "consent": True,
            "source_url": "/p/river-practitioner",
        },
        base_url="http://public.test",
    )
    assert enquiry_response.status_code == 201

    enquiries_response = client.get(
        f"/api/control/presence/nodes/{node_id}/enquiries",
        headers=headers,
        base_url="http://control.test",
    )
    assert enquiries_response.status_code == 200
    enquiries = enquiries_response.get_json()["data"]
    assert len(enquiries) == 1
    assert enquiries[0]["status"] == "new"

    status_response = client.patch(
        f"/api/control/presence/enquiries/{enquiries[0]['id']}",
        json={"status": "replied"},
        headers=headers,
        base_url="http://control.test",
    )
    assert status_response.status_code == 200
    assert status_response.get_json()["data"]["status"] == "replied"

    unpublish_response = client.post(
        f"/api/control/presence/nodes/{node_id}/unpublish",
        headers=headers,
        base_url="http://control.test",
    )
    assert unpublish_response.status_code == 200
    assert client.get("/api/presence/public/river-practitioner", base_url="http://public.test").status_code == 404


def test_presence_basic_premium_artist_collections_and_works_alpha_flow():
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    headers = _headers(app)

    basic = client.post(
        "/api/control/presence/nodes",
        json={
            "tenant_id": tenant_id,
            "organisation_id": tenant_id,
            "slug": "basic-card",
            "display_name": "Basic Card",
            "headline": "Simple public card",
            "node_type": "custom",
            "display_mode": "profile_card",
            "plan_type": "basic",
            "visibility": "public",
            "links": [{"label": "Website", "url": "https://example.org"}],
        },
        headers=headers,
        base_url="http://control.test",
    )
    assert basic.status_code == 201
    basic_id = basic.get_json()["data"]["id"]
    client.post(f"/api/control/presence/nodes/{basic_id}/publish", headers=headers, base_url="http://control.test")
    public_basic = client.get("/api/presence/public/basic-card", base_url="http://public.test")
    assert public_basic.status_code == 200
    assert public_basic.get_json()["data"]["display_mode"] == "profile_card"

    premium = client.post(
        "/api/control/presence/nodes",
        json={**_node_payload(tenant_id, slug="premium-practitioner"), "display_mode": "practitioner_profile", "plan_type": "premium"},
        headers=headers,
        base_url="http://control.test",
    )
    assert premium.status_code == 201
    premium_id = premium.get_json()["data"]["id"]
    client.post(f"/api/control/presence/nodes/{premium_id}/publish", headers=headers, base_url="http://control.test")
    public_premium = client.get("/api/presence/public/premium-practitioner", base_url="http://public.test")
    assert public_premium.status_code == 200
    assert public_premium.get_json()["data"]["plan_type"] == "premium"

    artist = client.post(
        "/api/control/presence/nodes",
        json={
            "tenant_id": tenant_id,
            "organisation_id": tenant_id,
            "slug": "artist-gallery",
            "display_name": "Kira Stone",
            "headline": "Public art and selected works",
            "node_type": "artist",
            "display_mode": "artist_gallery",
            "plan_type": "artist_presence",
            "visibility": "public",
            "landing_enabled": True,
            "landing_title": "Kira Stone Studio",
            "landing_subtitle": "A quiet gallery portal.",
            "landing_background_url": "https://example.org/landing.jpg",
            "landing_enter_label": "Enter studio",
            "practice_statement": "Practice statement text.",
            "curatorial_statement": "Curatorial statement text.",
            "archive_ready": True,
            "marketplace_ready": True,
        },
        headers=headers,
        base_url="http://control.test",
    )
    assert artist.status_code == 201
    artist_data = artist.get_json()["data"]
    artist_id = artist_data["id"]

    collection_response = client.post(
        f"/api/control/presence/nodes/{artist_id}/collections",
        json={"title": "Public Walls", "description": "Murals and participatory works.", "cover_image_url": "https://example.org/walls.jpg"},
        headers=headers,
        base_url="http://control.test",
    )
    assert collection_response.status_code == 201
    collection_id = collection_response.get_json()["data"]["id"]

    work_response = client.post(
        f"/api/control/presence/nodes/{artist_id}/works",
        json={
            "collection_id": collection_id,
            "title": "River Memory Wall",
            "year": "2026",
            "medium": "Acrylic",
            "dimensions": "18m wall",
            "description": "A selected public work.",
            "image_url": "https://example.org/work.jpg",
            "availability_status": "commissioned",
        },
        headers=headers,
        base_url="http://control.test",
    )
    assert work_response.status_code == 201
    work_id = work_response.get_json()["data"]["id"]

    hidden_work = client.patch(
        f"/api/control/presence/works/{work_id}",
        json={"is_visible": False, "title": "River Memory Wall Updated"},
        headers=headers,
        base_url="http://control.test",
    )
    assert hidden_work.status_code == 200
    assert hidden_work.get_json()["data"]["is_visible"] is False
    assert hidden_work.get_json()["data"]["title"] == "River Memory Wall Updated"

    shown_work = client.patch(
        f"/api/control/presence/works/{work_id}",
        json={"is_visible": True},
        headers=headers,
        base_url="http://control.test",
    )
    assert shown_work.status_code == 200

    collection_update = client.patch(
        f"/api/control/presence/collections/{collection_id}",
        json={"title": "Public Walls Updated"},
        headers=headers,
        base_url="http://control.test",
    )
    assert collection_update.status_code == 200
    assert collection_update.get_json()["data"]["title"] == "Public Walls Updated"

    client.post(f"/api/control/presence/nodes/{artist_id}/publish", headers=headers, base_url="http://control.test")
    public_artist = client.get("/api/presence/public/artist-gallery", base_url="http://public.test")
    assert public_artist.status_code == 200
    artist_public_data = public_artist.get_json()["data"]
    assert artist_public_data["display_mode"] == "artist_gallery"
    assert artist_public_data["collections"][0]["title"] == "Public Walls Updated"
    assert artist_public_data["works"][0]["title"] == "River Memory Wall Updated"
    assert artist_public_data["practice_statement"] == "Practice statement text."


def test_presence_public_work_detail_endpoint_returns_public_safe_payload_and_blocks_non_public_access():
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    headers = _headers(app)

    ids = _create_artist_node_with_collection_and_work(client, headers, tenant_id, slug="detail-work-node")
    client.post(f"/api/control/presence/nodes/{ids['node_id']}/publish", headers=headers, base_url="http://control.test")

    detail_response = client.get(
        f"/api/presence/public/{ids['slug']}/works/{ids['work_id']}",
        base_url="http://public.test",
    )
    assert detail_response.status_code == 200
    payload = detail_response.get_json()["data"]
    node = payload["node"]
    work = payload["work"]
    collection = payload["collection"]

    assert work["id"] == ids["work_id"]
    assert work["title"] == "River Memory Wall"
    assert work["description"] == "A selected public work."
    assert work["medium"] == "Acrylic"
    assert work["year"] == "2026"
    assert work["is_visible"] is True
    assert collection["id"] == ids["collection_id"]
    assert collection["title"] == "Public Walls"
    assert collection["node_id"] is None
    assert node["slug"] == ids["slug"]
    assert node["status"] == "published"
    assert "owner_user_id" not in node
    assert "tenant_id" not in node
    assert "organisation_id" not in node
    for key in ("connections", "quotes", "variations", "invoice_support_records", "handovers", "nfc_tags"):
        assert key not in node

    hidden_work = client.patch(
        f"/api/control/presence/works/{ids['work_id']}",
        json={"is_visible": False},
        headers=headers,
        base_url="http://control.test",
    )
    assert hidden_work.status_code == 200
    hidden_detail = client.get(
        f"/api/presence/public/{ids['slug']}/works/{ids['work_id']}",
        base_url="http://public.test",
    )
    assert hidden_detail.status_code == 404

    client.patch(
        f"/api/control/presence/works/{ids['work_id']}",
        json={"is_visible": True},
        headers=headers,
        base_url="http://control.test",
    )

    client.post(f"/api/control/presence/nodes/{ids['node_id']}/unpublish", headers=headers, base_url="http://control.test")
    assert client.get(f"/api/presence/public/{ids['slug']}/works/{ids['work_id']}", base_url="http://public.test").status_code == 404

    client.post(f"/api/control/presence/nodes/{ids['node_id']}/publish", headers=headers, base_url="http://control.test")
    client.patch(
        f"/api/control/presence/nodes/{ids['node_id']}",
        json={"visibility": "private"},
        headers=headers,
        base_url="http://control.test",
    )
    assert client.get(f"/api/presence/public/{ids['slug']}/works/{ids['work_id']}", base_url="http://public.test").status_code == 404

    client.patch(
        f"/api/control/presence/nodes/{ids['node_id']}",
        json={"visibility": "public"},
        headers=headers,
        base_url="http://control.test",
    )
    client.post(f"/api/control/presence/nodes/{ids['node_id']}/suspend", headers=headers, base_url="http://control.test")
    assert client.get(f"/api/presence/public/{ids['slug']}/works/{ids['work_id']}", base_url="http://public.test").status_code == 404

    client.post(f"/api/control/presence/nodes/{ids['node_id']}/publish", headers=headers, base_url="http://control.test")
    client.post(f"/api/control/presence/nodes/{ids['node_id']}/archive", headers=headers, base_url="http://control.test")
    assert client.get(f"/api/presence/public/{ids['slug']}/works/{ids['work_id']}", base_url="http://public.test").status_code == 404



def test_presence_public_collection_detail_endpoint_returns_public_safe_payload_and_blocks_non_public_access():
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    headers = _headers(app)

    ids = _create_artist_node_with_collection_and_work(client, headers, tenant_id, slug="detail-collection-node")
    hidden_work = client.post(
        f"/api/control/presence/nodes/{ids['node_id']}/works",
        json={
            "collection_id": ids["collection_id"],
            "title": "Hidden Studio Study",
            "year": "2025",
            "description": "Should not appear publicly.",
            "image_url": "https://example.org/hidden-work.jpg",
            "is_visible": False,
        },
        headers=headers,
        base_url="http://control.test",
    )
    assert hidden_work.status_code == 201
    client.post(f"/api/control/presence/nodes/{ids['node_id']}/publish", headers=headers, base_url="http://control.test")

    detail_response = client.get(
        f"/api/presence/public/{ids['slug']}/collections/{ids['collection_id']}",
        base_url="http://public.test",
    )
    assert detail_response.status_code == 200
    payload = detail_response.get_json()["data"]
    node = payload["node"]
    collection = payload["collection"]
    works = payload["works"]

    assert collection["id"] == ids["collection_id"]
    assert collection["title"] == "Public Walls"
    assert collection["description"] == "Murals and participatory works."
    assert collection["node_id"] is None
    assert len(works) == 1
    assert works[0]["id"] == ids["work_id"]
    assert works[0]["title"] == "River Memory Wall"
    assert works[0]["is_visible"] is True
    assert node["slug"] == ids["slug"]
    assert "owner_user_id" not in node
    assert "tenant_id" not in node
    assert "organisation_id" not in node
    for key in ("connections", "quotes", "variations", "invoice_support_records", "handovers", "nfc_tags"):
        assert key not in node

    hidden_collection = client.patch(
        f"/api/control/presence/collections/{ids['collection_id']}",
        json={"is_visible": False},
        headers=headers,
        base_url="http://control.test",
    )
    assert hidden_collection.status_code == 200
    hidden_detail = client.get(
        f"/api/presence/public/{ids['slug']}/collections/{ids['collection_id']}",
        base_url="http://public.test",
    )
    assert hidden_detail.status_code == 404

    client.patch(
        f"/api/control/presence/collections/{ids['collection_id']}",
        json={"is_visible": True},
        headers=headers,
        base_url="http://control.test",
    )

    client.post(f"/api/control/presence/nodes/{ids['node_id']}/unpublish", headers=headers, base_url="http://control.test")
    assert client.get(f"/api/presence/public/{ids['slug']}/collections/{ids['collection_id']}", base_url="http://public.test").status_code == 404

    client.post(f"/api/control/presence/nodes/{ids['node_id']}/publish", headers=headers, base_url="http://control.test")
    client.patch(
        f"/api/control/presence/nodes/{ids['node_id']}",
        json={"visibility": "private"},
        headers=headers,
        base_url="http://control.test",
    )
    assert client.get(f"/api/presence/public/{ids['slug']}/collections/{ids['collection_id']}", base_url="http://public.test").status_code == 404

    client.patch(
        f"/api/control/presence/nodes/{ids['node_id']}",
        json={"visibility": "public"},
        headers=headers,
        base_url="http://control.test",
    )
    client.post(f"/api/control/presence/nodes/{ids['node_id']}/suspend", headers=headers, base_url="http://control.test")
    assert client.get(f"/api/presence/public/{ids['slug']}/collections/{ids['collection_id']}", base_url="http://public.test").status_code == 404

    client.post(f"/api/control/presence/nodes/{ids['node_id']}/publish", headers=headers, base_url="http://control.test")
    client.post(f"/api/control/presence/nodes/{ids['node_id']}/archive", headers=headers, base_url="http://control.test")
    assert client.get(f"/api/presence/public/{ids['slug']}/collections/{ids['collection_id']}", base_url="http://public.test").status_code == 404



def test_presence_owner_nodes_route_lists_owned_nodes_with_owner_safe_fields():
    app = _build_app()
    tenant_a_id, tenant_b_id = _seed_fixture(app)
    client = app.test_client()
    control_headers = _headers(app)

    from manara_backend_app.models import User

    with app.app_context():
        owner_a_id = User.query.filter_by(username="node-admin").first().id
    owner_b_id = _create_owner_user(
        app,
        username="node-admin-b",
        pseudonym="Node Admin B",
        email="node-admin-b@example.com",
        node_id=tenant_b_id,
    )

    owner_node = _create_presence_node_for_owner(
        client,
        control_headers,
        tenant_a_id,
        owner_a_id,
        slug="owner-node-alpha",
        display_name="Owner Alpha",
    )
    _create_presence_node_for_owner(
        client,
        control_headers,
        tenant_b_id,
        owner_b_id,
        slug="owner-node-beta",
        display_name="Owner Beta",
    )

    response = client.get(
        "/api/presence/owner/nodes",
        headers=_owner_headers(app, "node-admin", "node_admin"),
        base_url="http://public.test",
    )
    assert response.status_code == 200

    rows = response.get_json()["data"]
    row = next(item for item in rows if item["slug"] == "owner-node-alpha")
    assert row["id"] == owner_node["id"]
    assert row["slug"] == "owner-node-alpha"
    assert row["display_name"] == "Owner Alpha"
    assert row["display_mode"] == "practitioner_profile"
    assert row["plan_type"] == "premium"
    assert row["status"] == "draft"
    assert row["visibility"] == "public"
    assert row["public_url"].endswith("/p/owner-node-alpha")

    for key in (
        "owner_user_id",
        "tenant_id",
        "organisation_id",
        "organisation",
        "quotes",
        "invoice_support_records",
        "connections",
        "handovers",
        "nfc_tags",
        "procurement_profile",
    ):
        assert key not in row



def test_presence_owner_node_detail_returns_owner_safe_payload_for_owned_node():
    app = _build_app()
    tenant_a_id, _ = _seed_fixture(app)
    client = app.test_client()
    control_headers = _headers(app)

    from manara_backend_app.models import User

    with app.app_context():
        owner_a_id = User.query.filter_by(username="node-admin").first().id

    owner_node = _create_presence_node_for_owner(
        client,
        control_headers,
        tenant_a_id,
        owner_a_id,
        slug="owner-node-detail-alpha",
        display_name="Owner Detail Alpha",
        extra={
            "curatorial_statement": "Curatorial statement for owner detail.",
            "visual_mood": "studio-quiet",
            "theme_config": {"accent": "#123456", "surface": "paper"},
            "procurement_profile": {
                "business_name": "Owner Detail Studio",
                "abn_acn_or_registration": "11 222 333 444",
                "regions_served": ["NSW"],
                "contract_types": ["Commission"],
                "rate_label": "From $500",
                "insurance_status": "Held",
                "nda_ready": True,
                "procurement_contact_email": "private-procurement@example.org",
                "compliance_notes": "Internal only notes.",
                "payment_terms_label": "14 days",
            },
        },
    )
    publish_response = client.post(
        f"/api/control/presence/nodes/{owner_node['id']}/publish",
        headers=control_headers,
        base_url="http://control.test",
    )
    assert publish_response.status_code == 200

    response = client.get(
        f"/api/presence/owner/nodes/{owner_node['id']}",
        headers=_owner_headers(app, "node-admin", "node_admin"),
        base_url="http://public.test",
    )
    assert response.status_code == 200

    data = response.get_json()["data"]
    assert data["id"] == owner_node["id"]
    assert data["slug"] == "owner-node-detail-alpha"
    assert data["display_name"] == "Owner Detail Alpha"
    assert data["headline"] == "Trauma-informed practitioner"
    assert data["bio"] == "<b>Gentle care</b> for community members."
    assert data["display_mode"] == "practitioner_profile"
    assert data["plan_type"] == "premium"
    assert data["status"] == "published"
    assert data["visibility"] == "public"
    assert "template_id" in data
    assert data["theme_config"]["accent"] == "#123456"
    assert data["visual_mood"] == "studio-quiet"
    assert data["profile_image_url"] == "https://example.org/river.jpg"
    assert data["cover_image_url"] == "https://example.org/cover.jpg"
    assert data["practice_statement"] == "Practice is consent-led and community-aware."
    assert data["curatorial_statement"] == "Curatorial statement for owner detail."
    assert data["published_at"] is not None
    assert data["directory_ready"] is True
    assert data["map_ready"] is True
    assert data["public_url"].endswith("/p/owner-node-detail-alpha")

    procurement = data["procurement_profile"]
    assert procurement["business_name"] == "Owner Detail Studio"
    assert procurement["rate_label"] == "From $500"
    assert procurement["nda_ready"] is True
    for key in ("node_id", "abn_acn_or_registration", "procurement_contact_email", "compliance_notes"):
        assert key not in procurement

    for key in (
        "owner_user_id",
        "tenant_id",
        "organisation_id",
        "organisation",
        "connections",
        "quotes",
        "variations",
        "invoice_support_records",
        "handovers",
        "nfc_tags",
    ):
        assert key not in data



def test_presence_owner_node_detail_denies_cross_owner_access():
    app = _build_app()
    tenant_a_id, tenant_b_id = _seed_fixture(app)
    client = app.test_client()
    control_headers = _headers(app)

    from manara_backend_app.models import User

    with app.app_context():
        owner_a_id = User.query.filter_by(username="node-admin").first().id
    owner_b_id = _create_owner_user(
        app,
        username="node-admin-b",
        pseudonym="Node Admin B",
        email="node-admin-b@example.com",
        node_id=tenant_b_id,
    )

    _create_presence_node_for_owner(
        client,
        control_headers,
        tenant_a_id,
        owner_a_id,
        slug="owner-node-detail-alpha",
        display_name="Owner Detail Alpha",
    )
    owner_b_node = _create_presence_node_for_owner(
        client,
        control_headers,
        tenant_b_id,
        owner_b_id,
        slug="owner-node-detail-beta",
        display_name="Owner Detail Beta",
    )

    response = client.get(
        f"/api/presence/owner/nodes/{owner_b_node['id']}",
        headers=_owner_headers(app, "node-admin", "node_admin"),
        base_url="http://public.test",
    )
    assert response.status_code == 403
    assert response.get_json()["error"]["code"] == "forbidden"



def test_presence_owner_node_mutation_routes_require_auth():
    app = _build_app()
    tenant_a_id, _ = _seed_fixture(app)
    client = app.test_client()
    control_headers = _headers(app)

    from manara_backend_app.models import User

    with app.app_context():
        owner_a_id = User.query.filter_by(username="node-admin").first().id

    owner_node = _create_presence_node_for_owner(
        client,
        control_headers,
        tenant_a_id,
        owner_a_id,
        slug="owner-node-mutation-auth",
        display_name="Owner Mutation Auth",
    )

    for method, path, kwargs in (
        (client.patch, f"/api/presence/owner/nodes/{owner_node['id']}", {"json": {"display_name": "Blocked"}}),
        (client.post, f"/api/presence/owner/nodes/{owner_node['id']}/publish", {}),
        (client.post, f"/api/presence/owner/nodes/{owner_node['id']}/unpublish", {}),
        (client.post, f"/api/presence/owner/nodes/{owner_node['id']}/suspend", {}),
    ):
        response = method(path, base_url="http://public.test", **kwargs)
        assert response.status_code == 401



def test_presence_owner_node_patch_updates_safe_fields_and_ignores_control_only_fields():
    app = _build_app()
    tenant_a_id, tenant_b_id = _seed_fixture(app)
    client = app.test_client()
    control_headers = _headers(app)

    from manara_backend_app.models import PresenceNode, User

    with app.app_context():
        owner_a_id = User.query.filter_by(username="node-admin").first().id
    owner_b_id = _create_owner_user(
        app,
        username="node-admin-b",
        pseudonym="Node Admin B",
        email="node-admin-b@example.com",
        node_id=tenant_b_id,
    )

    owner_node = _create_presence_node_for_owner(
        client,
        control_headers,
        tenant_a_id,
        owner_a_id,
        slug="owner-node-patch-alpha",
        display_name="Owner Patch Alpha",
    )

    response = client.patch(
        f"/api/presence/owner/nodes/{owner_node['id']}",
        json={
            "display_name": "Owner Patch Alpha Revised",
            "headline": "Updated owner headline",
            "bio": "<p>Updated owner bio</p>",
            "theme_config": {"accent": "#abcdef"},
            "visual_mood": "studio-bright",
            "profile_image_url": "https://example.org/owner-patch-profile.jpg",
            "cover_image_url": "https://example.org/owner-patch-cover.jpg",
            "practice_statement": "Updated practice statement.",
            "curatorial_statement": "Updated curatorial statement.",
            "tenant_id": tenant_b_id,
            "owner_user_id": owner_b_id,
            "organisation_id": tenant_b_id,
            "status": "published",
            "quotes": [{"title": "Should be ignored"}],
            "invoice_support_records": [{"invoice_number": "INV-001"}],
            "handovers": [{"summary": "Should be ignored"}],
        },
        headers=_owner_headers(app, "node-admin", "node_admin"),
        base_url="http://public.test",
    )
    assert response.status_code == 200

    data = response.get_json()["data"]
    _assert_owner_safe_node_detail_payload(
        data,
        expected_slug="owner-node-patch-alpha",
        expected_display_name="Owner Patch Alpha Revised",
        expected_status="draft",
        expected_headline="Updated owner headline",
        expected_bio="<p>Updated owner bio</p>",
        expected_visual_mood="studio-bright",
        expected_profile_image_url="https://example.org/owner-patch-profile.jpg",
        expected_cover_image_url="https://example.org/owner-patch-cover.jpg",
        expected_practice_statement="Updated practice statement.",
        expected_curatorial_statement="Updated curatorial statement.",
    )
    assert data["theme_config"]["accent"] == "#abcdef"
    assert data["published_at"] is None

    with app.app_context():
        node = PresenceNode.query.get(owner_node["id"])
        assert node.owner_user_id == owner_a_id
        assert node.tenant_id == tenant_a_id
        assert node.organisation_id == tenant_a_id
        assert node.status == "draft"
        assert len(node.quotes) == 0
        assert len(node.invoice_support_records) == 0
        assert len(node.handovers) == 0



def test_presence_owner_node_patch_denies_cross_owner_access():
    app = _build_app()
    tenant_a_id, tenant_b_id = _seed_fixture(app)
    client = app.test_client()
    control_headers = _headers(app)

    from manara_backend_app.models import PresenceNode, User

    with app.app_context():
        owner_a_id = User.query.filter_by(username="node-admin").first().id
    owner_b_id = _create_owner_user(
        app,
        username="node-admin-b",
        pseudonym="Node Admin B",
        email="node-admin-b@example.com",
        node_id=tenant_b_id,
    )

    owner_b_node = _create_presence_node_for_owner(
        client,
        control_headers,
        tenant_b_id,
        owner_b_id,
        slug="owner-node-patch-beta",
        display_name="Owner Patch Beta",
    )

    response = client.patch(
        f"/api/presence/owner/nodes/{owner_b_node['id']}",
        json={"display_name": "Blocked rename"},
        headers=_owner_headers(app, "node-admin", "node_admin"),
        base_url="http://public.test",
    )
    assert response.status_code == 403
    assert response.get_json()["error"]["code"] == "forbidden"

    with app.app_context():
        node = PresenceNode.query.get(owner_b_node["id"])
        assert node.display_name == "Owner Patch Beta"
        assert node.owner_user_id == owner_b_id
        assert node.tenant_id == tenant_b_id



def test_presence_owner_node_publish_and_unpublish_return_owner_safe_payload_and_hide_public_route():
    app = _build_app()
    tenant_a_id, _ = _seed_fixture(app)
    client = app.test_client()
    control_headers = _headers(app)

    from manara_backend_app.models import User

    with app.app_context():
        owner_a_id = User.query.filter_by(username="node-admin").first().id

    owner_node = _create_presence_node_for_owner(
        client,
        control_headers,
        tenant_a_id,
        owner_a_id,
        slug="owner-node-publish-alpha",
        display_name="Owner Publish Alpha",
    )

    publish_response = client.post(
        f"/api/presence/owner/nodes/{owner_node['id']}/publish",
        headers=_owner_headers(app, "node-admin", "node_admin"),
        base_url="http://public.test",
    )
    assert publish_response.status_code == 200
    published = publish_response.get_json()["data"]
    _assert_owner_safe_node_detail_payload(
        published,
        expected_slug="owner-node-publish-alpha",
        expected_display_name="Owner Publish Alpha",
        expected_status="published",
        expected_headline="Trauma-informed practitioner",
        expected_bio="<b>Gentle care</b> for community members.",
        expected_profile_image_url="https://example.org/river.jpg",
        expected_cover_image_url="https://example.org/cover.jpg",
        expected_practice_statement="Practice is consent-led and community-aware.",
    )
    assert published["published_at"] is not None
    assert client.get("/api/presence/public/owner-node-publish-alpha", base_url="http://public.test").status_code == 200

    unpublish_response = client.post(
        f"/api/presence/owner/nodes/{owner_node['id']}/unpublish",
        headers=_owner_headers(app, "node-admin", "node_admin"),
        base_url="http://public.test",
    )
    assert unpublish_response.status_code == 200
    unpublished = unpublish_response.get_json()["data"]
    _assert_owner_safe_node_detail_payload(
        unpublished,
        expected_slug="owner-node-publish-alpha",
        expected_display_name="Owner Publish Alpha",
        expected_status="unpublished",
        expected_headline="Trauma-informed practitioner",
        expected_bio="<b>Gentle care</b> for community members.",
        expected_profile_image_url="https://example.org/river.jpg",
        expected_cover_image_url="https://example.org/cover.jpg",
        expected_practice_statement="Practice is consent-led and community-aware.",
    )
    assert client.get("/api/presence/public/owner-node-publish-alpha", base_url="http://public.test").status_code == 404



def test_presence_owner_node_publish_and_unpublish_denies_cross_owner_access():
    app = _build_app()
    tenant_a_id, tenant_b_id = _seed_fixture(app)
    client = app.test_client()
    control_headers = _headers(app)

    from manara_backend_app.models import PresenceNode, User

    with app.app_context():
        owner_a_id = User.query.filter_by(username="node-admin").first().id
    owner_b_id = _create_owner_user(
        app,
        username="node-admin-b",
        pseudonym="Node Admin B",
        email="node-admin-b@example.com",
        node_id=tenant_b_id,
    )

    _create_presence_node_for_owner(
        client,
        control_headers,
        tenant_a_id,
        owner_a_id,
        slug="owner-node-publish-alpha",
        display_name="Owner Publish Alpha",
    )
    owner_b_node = _create_presence_node_for_owner(
        client,
        control_headers,
        tenant_b_id,
        owner_b_id,
        slug="owner-node-publish-beta",
        display_name="Owner Publish Beta",
    )

    publish_response = client.post(
        f"/api/presence/owner/nodes/{owner_b_node['id']}/publish",
        headers=_owner_headers(app, "node-admin", "node_admin"),
        base_url="http://public.test",
    )
    assert publish_response.status_code == 403
    assert publish_response.get_json()["error"]["code"] == "forbidden"

    unpublish_response = client.post(
        f"/api/presence/owner/nodes/{owner_b_node['id']}/unpublish",
        headers=_owner_headers(app, "node-admin", "node_admin"),
        base_url="http://public.test",
    )
    assert unpublish_response.status_code == 403
    assert unpublish_response.get_json()["error"]["code"] == "forbidden"

    with app.app_context():
        node = PresenceNode.query.get(owner_b_node["id"])
        assert node.status == "draft"



def test_presence_owner_node_suspend_is_control_only_for_normal_owners():
    app = _build_app()
    tenant_a_id, _ = _seed_fixture(app)
    client = app.test_client()
    control_headers = _headers(app)

    from manara_backend_app.models import PresenceNode, User

    with app.app_context():
        owner_a_id = User.query.filter_by(username="node-admin").first().id

    owner_node = _create_presence_node_for_owner(
        client,
        control_headers,
        tenant_a_id,
        owner_a_id,
        slug="owner-node-suspend-alpha",
        display_name="Owner Suspend Alpha",
    )
    publish_response = client.post(
        f"/api/presence/owner/nodes/{owner_node['id']}/publish",
        headers=_owner_headers(app, "node-admin", "node_admin"),
        base_url="http://public.test",
    )
    assert publish_response.status_code == 200

    suspend_response = client.post(
        f"/api/presence/owner/nodes/{owner_node['id']}/suspend",
        headers=_owner_headers(app, "node-admin", "node_admin"),
        base_url="http://public.test",
    )
    assert suspend_response.status_code == 403
    assert suspend_response.get_json()["error"]["code"] == "forbidden"
    assert client.get("/api/presence/public/owner-node-suspend-alpha", base_url="http://public.test").status_code == 200

    with app.app_context():
        node = PresenceNode.query.get(owner_node["id"])
        assert node.status == "published"


def test_presence_owner_node_publish_cannot_restore_suspended_or_archived_nodes():
    app = _build_app()
    tenant_a_id, _ = _seed_fixture(app)
    client = app.test_client()
    control_headers = _headers(app)

    from manara_backend_app.models import PresenceNode, User

    with app.app_context():
        owner_a_id = User.query.filter_by(username="node-admin").first().id

    owner_node = _create_presence_node_for_owner(
        client,
        control_headers,
        tenant_a_id,
        owner_a_id,
        slug="owner-node-suspended-alpha",
        display_name="Owner Suspended Alpha",
    )
    publish_response = client.post(
        f"/api/presence/owner/nodes/{owner_node['id']}/publish",
        headers=_owner_headers(app, "node-admin", "node_admin"),
        base_url="http://public.test",
    )
    assert publish_response.status_code == 200

    suspend_response = client.post(
        f"/api/control/presence/nodes/{owner_node['id']}/suspend",
        headers=control_headers,
        base_url="http://control.test",
    )
    assert suspend_response.status_code == 200
    assert client.get("/api/presence/public/owner-node-suspended-alpha", base_url="http://public.test").status_code == 404

    owner_publish = client.post(
        f"/api/presence/owner/nodes/{owner_node['id']}/publish",
        headers=_owner_headers(app, "node-admin", "node_admin"),
        base_url="http://public.test",
    )
    assert owner_publish.status_code == 403
    assert owner_publish.get_json()["error"]["code"] == "forbidden"

    with app.app_context():
        node = PresenceNode.query.get(owner_node["id"])
        assert node.status == "suspended"

    assert client.get("/api/presence/public/owner-node-suspended-alpha", base_url="http://public.test").status_code == 404

    archived_node = _create_presence_node_for_owner(
        client,
        control_headers,
        tenant_a_id,
        owner_a_id,
        slug="owner-node-archived-alpha",
        display_name="Owner Archived Alpha",
    )
    assert client.post(
        f"/api/presence/owner/nodes/{archived_node['id']}/publish",
        headers=_owner_headers(app, "node-admin", "node_admin"),
        base_url="http://public.test",
    ).status_code == 200
    archive_response = client.post(
        f"/api/control/presence/nodes/{archived_node['id']}/archive",
        headers=control_headers,
        base_url="http://control.test",
    )
    assert archive_response.status_code == 200

    owner_archive_publish = client.post(
        f"/api/presence/owner/nodes/{archived_node['id']}/publish",
        headers=_owner_headers(app, "node-admin", "node_admin"),
        base_url="http://public.test",
    )
    assert owner_archive_publish.status_code == 403
    assert owner_archive_publish.get_json()["error"]["code"] == "forbidden"

    with app.app_context():
        node = PresenceNode.query.get(archived_node["id"])
        assert node.status == "archived"

    assert client.get("/api/presence/public/owner-node-archived-alpha", base_url="http://public.test").status_code == 404



def test_presence_owner_nodes_route_excludes_nodes_owned_by_other_users():
    app = _build_app()
    tenant_a_id, tenant_b_id = _seed_fixture(app)
    client = app.test_client()
    control_headers = _headers(app)

    from manara_backend_app.models import User

    with app.app_context():
        owner_a_id = User.query.filter_by(username="node-admin").first().id
    owner_b_id = _create_owner_user(
        app,
        username="node-admin-b",
        pseudonym="Node Admin B",
        email="node-admin-b@example.com",
        node_id=tenant_b_id,
    )

    _create_presence_node_for_owner(
        client,
        control_headers,
        tenant_a_id,
        owner_a_id,
        slug="owner-node-alpha",
        display_name="Owner Alpha",
    )
    _create_presence_node_for_owner(
        client,
        control_headers,
        tenant_b_id,
        owner_b_id,
        slug="owner-node-beta",
        display_name="Owner Beta",
    )

    response = client.get(
        "/api/presence/owner/nodes",
        headers=_owner_headers(app, "node-admin", "node_admin"),
        base_url="http://public.test",
    )
    assert response.status_code == 200
    slugs = {row["slug"] for row in response.get_json()["data"]}
    assert "owner-node-alpha" in slugs
    assert "owner-node-beta" not in slugs



def test_owner_nodes_without_auth_returns_401_not_500():
    app = _build_app()
    _seed_fixture(app)
    client = app.test_client()

    response = client.get("/api/presence/owner/nodes", base_url="http://public.test")
    assert response.status_code == 401
    assert response.status_code != 500


def test_owner_nodes_invalid_token_returns_401_not_500():
    app = _build_app()
    _seed_fixture(app)
    client = app.test_client()

    response = client.get(
        "/api/presence/owner/nodes",
        headers={"Authorization": "Bearer definitely-not-a-jwt"},
        base_url="http://public.test",
    )
    assert response.status_code == 401
    assert response.status_code != 500


def test_owner_nodes_valid_supabase_user_without_local_user_provisions_safe_user():
    app = _build_app()
    _seed_fixture(app)
    client = app.test_client()
    subject = "anu-supabase-owner-empty"
    email = "anu-supabase-owner-empty@example.com"
    headers = _supabase_owner_headers(
        app,
        sub=subject,
        email=email,
        display_name="New Presence Owner",
    )

    response = client.get(
        "/api/presence/owner/nodes",
        headers=headers,
        base_url="http://public.test",
    )

    assert response.status_code == 200, response.get_json()
    assert response.get_json()["data"] == []

    from manara_backend_app.extensions import db as _db
    from manara_backend_app.models import User

    with app.app_context():
        user = _db.session.query(User).filter_by(global_subject_id=subject).one()
        assert user.email == email
        assert user.role == "participant"
        assert user.node_id is None
        assert user.role not in {"platform_admin", "node_admin", "control_operator", "tenant_admin"}


def test_owner_nodes_existing_user_without_nodes_returns_empty_list():
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    subject = "anu-existing-empty-owner"
    email = "anu-existing-empty@example.com"
    _create_owner_user(
        app,
        username="anu-existing-empty",
        pseudonym="Existing Empty",
        email=email,
        node_id=tenant_id,
        role="participant",
    )

    from manara_backend_app.extensions import db as _db
    from manara_backend_app.models import User

    with app.app_context():
        user = _db.session.query(User).filter_by(email=email).one()
        user.global_subject_id = subject
        _db.session.commit()

    response = client.get(
        "/api/presence/owner/nodes",
        headers=_supabase_owner_headers(app, sub=subject, email=email),
        base_url="http://public.test",
    )

    assert response.status_code == 200, response.get_json()
    assert response.get_json()["data"] == []


def test_owner_identity_upsert_is_idempotent():
    app = _build_app()
    _seed_fixture(app)
    client = app.test_client()
    subject = "anu-idempotent-owner"
    headers = _supabase_owner_headers(app, sub=subject, email="anu-idempotent@example.com")

    first = client.get("/api/presence/owner/nodes", headers=headers, base_url="http://public.test")
    second = client.get("/api/presence/owner/nodes", headers=headers, base_url="http://public.test")

    assert first.status_code == 200, first.get_json()
    assert second.status_code == 200, second.get_json()

    from manara_backend_app.extensions import db as _db
    from manara_backend_app.models import User

    with app.app_context():
        assert _db.session.query(User).filter_by(global_subject_id=subject).count() == 1


def test_owner_identity_upsert_never_grants_admin_or_control_permissions():
    app = _build_app()
    _seed_fixture(app)
    client = app.test_client()
    subject = "anu-metadata-elevation-attempt"

    response = client.get(
        "/api/presence/owner/nodes",
        headers=_supabase_owner_headers(
            app,
            sub=subject,
            email="anu-elevation-attempt@example.com",
            extra_claims={
                "role": "platform_admin",
                "username": "platform-admin",
                "preferred_username": "platform-admin",
                "user_metadata": {
                    "display_name": "Elevated By Metadata",
                    "role": "platform_admin",
                    "is_admin": True,
                },
                "app_metadata": {
                    "provider": "email",
                    "role": "platform_admin",
                    "roles": ["platform_admin", "control_operator"],
                },
            },
        ),
        base_url="http://public.test",
    )

    assert response.status_code == 200, response.get_json()

    from manara_backend_app.extensions import db as _db
    from manara_backend_app.models import User

    with app.app_context():
        user = _db.session.query(User).filter_by(global_subject_id=subject).one()
        assert user.role == "participant"
        assert user.node_id is None
        assert user.username != "platform-admin"
        assert user.role not in {"platform_admin", "node_admin", "control_operator", "tenant_admin"}


def test_owner_media_upload_requires_auth_not_500():
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    headers = _headers(app)

    from manara_backend_app.models import User

    with app.app_context():
        owner_id = User.query.filter_by(username="node-admin").first().id
    node = _create_presence_node_for_owner(
        client,
        headers,
        tenant_id,
        owner_id,
        slug="media-auth-node",
        display_name="Media Auth Node",
    )

    response = _upload_image(client, node_id=node["id"])

    assert response.status_code == 401
    assert response.status_code != 500


def test_owner_media_upload_rejects_invalid_mime_and_oversized_file():
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    headers = _headers(app)
    owner_headers = _owner_headers(app, "node-admin", "node_admin")
    app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

    from manara_backend_app.models import User

    with app.app_context():
        owner_id = User.query.filter_by(username="node-admin").first().id
    node = _create_presence_node_for_owner(
        client,
        headers,
        tenant_id,
        owner_id,
        slug="media-validation-node",
        display_name="Media Validation Node",
    )

    invalid = _upload_image(
        client,
        node_id=node["id"],
        headers=owner_headers,
        filename="bad.html",
        content=b"<html><script>alert(1)</script></html>",
    )
    assert invalid.status_code == 422, invalid.get_json()

    oversized = _upload_image(
        client,
        node_id=node["id"],
        headers=owner_headers,
        filename="large.png",
        content=b"\x89PNG\r\n\x1a\n" + b"x" * (8 * 1024 * 1024 + 2),
    )
    assert oversized.status_code == 422, oversized.get_json()


def test_owner_media_upload_rejects_cross_owner_node():
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    control_headers = _headers(app)

    from manara_backend_app.models import User

    with app.app_context():
        owner_a_id = User.query.filter_by(username="node-admin").first().id
    _create_owner_user(
        app,
        username="media-owner-b",
        pseudonym="Media Owner B",
        email="media-b@example.com",
        node_id=tenant_id,
        role="participant",
    )
    node = _create_presence_node_for_owner(
        client,
        control_headers,
        tenant_id,
        owner_a_id,
        slug="media-cross-owner",
        display_name="Media Cross Owner",
    )

    response = _upload_image(
        client,
        node_id=node["id"],
        headers=_owner_headers(app, "media-owner-b", "participant"),
    )

    assert response.status_code == 403


def test_owner_media_upload_saves_profile_image_and_clear_removes_it(monkeypatch):
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    control_headers = _headers(app)
    owner_headers = _owner_headers(app, "node-admin", "node_admin")
    _patch_presence_media_store(monkeypatch)

    from manara_backend_app.extensions import db as _db
    from manara_backend_app.models import PresenceNode, User

    with app.app_context():
        owner_id = User.query.filter_by(username="node-admin").first().id
    node = _create_presence_node_for_owner(
        client,
        control_headers,
        tenant_id,
        owner_id,
        slug="media-profile-node",
        display_name="Media Profile Node",
    )

    uploaded = _upload_image(client, node_id=node["id"], headers=owner_headers)
    assert uploaded.status_code == 201, uploaded.get_json()
    data = uploaded.get_json()["data"]
    assert data["target_type"] == "profile_image"
    assert data["field"] == "profile_image_url"
    assert f"/presence/{owner_id}/{node['id']}/profile/" in data["url"]

    with app.app_context():
        row = _db.session.query(PresenceNode).get(node["id"])
        assert row.profile_image_url == data["url"]

    cleared = client.post(
        f"/api/presence/owner/nodes/{node['id']}/media/clear",
        json={"target_type": "profile_image"},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert cleared.status_code == 200, cleared.get_json()
    with app.app_context():
        row = _db.session.query(PresenceNode).get(node["id"])
        assert row.profile_image_url is None


def test_owner_media_upload_saves_work_and_collection_image_fields(monkeypatch):
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    control_headers = _headers(app)
    owner_headers = _owner_headers(app, "node-admin", "node_admin")
    _patch_presence_media_store(monkeypatch)

    from manara_backend_app.extensions import db as _db
    from manara_backend_app.models import PresenceCollection, PresenceNode, PresenceWork, User

    with app.app_context():
        owner_id = User.query.filter_by(username="node-admin").first().id
    node = _create_presence_node_for_owner(
        client,
        control_headers,
        tenant_id,
        owner_id,
        slug="media-child-node",
        display_name="Media Child Node",
    )
    work = client.post(
        f"/api/presence/owner/nodes/{node['id']}/works",
        json={"title": "Uploaded Work"},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert work.status_code == 201, work.get_json()
    collection = client.post(
        f"/api/presence/owner/nodes/{node['id']}/collections",
        json={"title": "Uploaded Collection"},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert collection.status_code == 201, collection.get_json()
    work_id = work.get_json()["data"]["id"]
    collection_id = collection.get_json()["data"]["id"]

    work_upload = _upload_image(
        client,
        node_id=node["id"],
        headers=owner_headers,
        target_type="work_image",
        extra={"work_id": str(work_id)},
    )
    assert work_upload.status_code == 201, work_upload.get_json()
    collection_upload = _upload_image(
        client,
        node_id=node["id"],
        headers=owner_headers,
        target_type="collection_cover",
        extra={"collection_id": str(collection_id)},
    )
    assert collection_upload.status_code == 201, collection_upload.get_json()

    with app.app_context():
        work_row = _db.session.query(PresenceWork).get(work_id)
        collection_row = _db.session.query(PresenceCollection).get(collection_id)
        assert work_row.image_url == work_upload.get_json()["data"]["url"]
        assert work_row.thumbnail_url == work_upload.get_json()["data"]["url"]
        assert collection_row.cover_image_url == collection_upload.get_json()["data"]["url"]


def test_presence_public_routes_still_hide_uploaded_image_draft(monkeypatch):
    app = _build_app()
    _seed_fixture(app)
    client = app.test_client()
    _patch_presence_media_store(monkeypatch)
    headers = _supabase_owner_headers(
        app,
        sub="anu-uploaded-draft-owner",
        email="anu-uploaded-draft-owner@example.com",
    )

    draft = client.post(
        "/api/presence/owner/beta/start",
        json={"display_name": "Uploaded Draft", "desired_slug": "uploaded-draft", "presence_type": "artist"},
        headers=headers,
        base_url="http://public.test",
    )
    assert draft.status_code == 201, draft.get_json()
    node_id = draft.get_json()["data"]["id"]

    uploaded = _upload_image(client, node_id=node_id, headers=headers)
    assert uploaded.status_code == 201, uploaded.get_json()

    assert client.get("/api/presence/public/uploaded-draft", base_url="http://public.test").status_code == 404



def test_presence_public_hides_unpublished_suspended_archived_and_private_nodes():
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    headers = _headers(app)

    node_ids = []
    for status in ["draft", "suspended", "archived"]:
        response = client.post(
            "/api/control/presence/nodes",
            json={**_node_payload(tenant_id, slug=f"{status}-node"), "status": status},
            headers=headers,
            base_url="http://control.test",
        )
        assert response.status_code == 201
        node_ids.append(response.get_json()["data"]["id"])

    private_response = client.post(
        "/api/control/presence/nodes",
        json={**_node_payload(tenant_id, slug="private-node"), "visibility": "private"},
        headers=headers,
        base_url="http://control.test",
    )
    assert private_response.status_code == 201
    private_id = private_response.get_json()["data"]["id"]
    client.post(f"/api/control/presence/nodes/{private_id}/publish", headers=headers, base_url="http://control.test")
    client.patch(
        f"/api/control/presence/nodes/{private_id}",
        json={"visibility": "private"},
        headers=headers,
        base_url="http://control.test",
    )

    for slug in ["draft-node", "suspended-node", "archived-node", "private-node"]:
        assert client.get(f"/api/presence/public/{slug}", base_url="http://public.test").status_code == 404


def test_presence_slug_uniqueness_tenant_scope_owner_and_auth_controls():
    app = _build_app()
    tenant_a_id, tenant_b_id = _seed_fixture(app)
    client = app.test_client()

    missing_auth = client.get("/api/control/presence/nodes", base_url="http://control.test")
    assert missing_auth.status_code == 401

    node_headers = _headers(app, "node-admin", "node_admin", node_id=tenant_a_id)
    first = client.post(
        "/api/control/presence/nodes",
        json=_node_payload(tenant_a_id, slug="scoped-node"),
        headers=node_headers,
        base_url="http://control.test",
    )
    assert first.status_code == 201
    first_data = first.get_json()["data"]
    assert first_data["tenant_id"] == tenant_a_id

    duplicate = client.post(
        "/api/control/presence/nodes",
        json=_node_payload(tenant_a_id, slug="scoped-node"),
        headers=node_headers,
        base_url="http://control.test",
    )
    assert duplicate.status_code == 201
    assert duplicate.get_json()["data"]["slug"] == "scoped-node-2"

    blocked = client.post(
        "/api/control/presence/nodes",
        json=_node_payload(tenant_b_id, slug="blocked-node"),
        headers=node_headers,
        base_url="http://control.test",
    )
    assert blocked.status_code == 403
    assert blocked.get_json()["error"]["code"] == "tenant_scope_forbidden"

    list_response = client.get("/api/control/presence/nodes", headers=node_headers, base_url="http://control.test")
    assert list_response.status_code == 200
    assert {row["tenant_id"] for row in list_response.get_json()["data"]} == {tenant_a_id}


def test_presence_spam_validation_templates_analytics_vcard_and_qr():
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    headers = _headers(app)

    templates = client.get("/api/control/presence/templates", headers=headers, base_url="http://control.test")
    assert templates.status_code == 200
    template_rows = templates.get_json()["data"]
    assert any(row["name"] == "Premium Practitioner Profile" for row in template_rows)
    assert any(row["display_mode"] == "artist_gallery" and row["supports_collections"] for row in template_rows)

    created = client.post(
        "/api/control/presence/nodes",
        json=_node_payload(tenant_id, slug="analytics-node"),
        headers=headers,
        base_url="http://control.test",
    ).get_json()["data"]
    client.post(f"/api/control/presence/nodes/{created['id']}/publish", headers=headers, base_url="http://control.test")

    spam = client.post(
        "/api/presence/public/analytics-node/enquiries",
        json={"website": "bot", "name": "Bot", "email": "bot@example.org", "message": "spam", "consent": True},
        base_url="http://public.test",
    )
    assert spam.status_code == 400

    analytics = client.post(
        "/api/presence/analytics/event",
        json={
            "slug": "analytics-node",
            "event_type": "link_clicked",
            "metadata": {"label": "Website", "url": "https://example.org"},
            "anonymous_session_id": "anon-1",
        },
        base_url="http://public.test",
    )
    assert analytics.status_code == 200

    detail = client.get(f"/api/control/presence/nodes/{created['id']}", headers=headers, base_url="http://control.test")
    assert detail.status_code == 200
    assert detail.get_json()["data"]["analytics"]["top_links"][0]["label"] == "Website"

    vcard = client.get("/api/presence/public/analytics-node/vcard", base_url="http://public.test")
    assert vcard.status_code == 200
    assert b"BEGIN:VCARD" in vcard.data
    assert b"River Stone" in vcard.data

    qr = client.get("/api/presence/public/analytics-node/qr", base_url="http://public.test")
    assert qr.status_code == 200
    assert qr.mimetype == "image/svg+xml"
    assert b"<svg" in qr.data
    # Scanner-grade QR uses <path> elements (not just <rect>) — confirms qrcode lib path is active.
    assert b"<path" in qr.data
    # Title element exposes the canonical public URL for accessibility/preview.
    assert b"<title>" in qr.data
    assert b"analytics-node" in qr.data


def test_presence_institutional_professional_tradie_nfc_relationship_ledger_flow():
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    headers = _headers(app)

    professional = client.post(
        "/api/control/presence/nodes",
        json={
            "tenant_id": tenant_id,
            "organisation_id": tenant_id,
            "slug": "contract-presence",
            "display_name": "Elian Ward",
            "headline": "Fractional operations advisor",
            "node_type": "advisor",
            "display_mode": "professional_contract",
            "plan_type": "professional_contract",
            "visibility": "public",
            "capability_statement": "Procurement-ready capability statement.",
            "proof_summary": "Proof ledger summary.",
            "procurement_summary": "Ready for advisory retainers.",
            "services": [{"title": "Operating review", "problem_solved": "Clarifies delivery risk.", "price_label": "From $4,500"}],
            "proof_items": [{"title": "Operating model reset", "industry": "Services", "challenge": "Unclear ownership.", "outcome": "Clearer delivery rhythm."}],
            "procurement_profile": {
                "business_name": "Elian Ward Advisory",
                "regions_served": ["Australia"],
                "contract_types": ["Retainer"],
                "rate_label": "From $4,500/month",
                "insurance_status": "Professional indemnity held",
                "nda_ready": True,
            },
        },
        headers=headers,
        base_url="http://control.test",
    )
    assert professional.status_code == 201
    professional_data = professional.get_json()["data"]
    assert professional_data["display_mode"] == "professional_contract"
    assert professional_data["proof_items"][0]["title"] == "Operating model reset"
    assert professional_data["procurement_profile"]["nda_ready"] is True
    client.post(f"/api/control/presence/nodes/{professional_data['id']}/publish", headers=headers, base_url="http://control.test")
    public_professional = client.get("/api/presence/public/contract-presence", base_url="http://public.test")
    assert public_professional.status_code == 200
    assert "owner_user_id" not in public_professional.get_json()["data"]
    assert "nfc_tags" not in public_professional.get_json()["data"]

    tradie = client.post(
        "/api/control/presence/nodes",
        json={
            **_node_payload(tenant_id, slug="harbour-electrical-test"),
            "display_name": "Harbour Electrical",
            "headline": "Licensed electrician in the Inner West",
            "node_type": "tradie",
            "display_mode": "tradie_profile",
            "plan_type": "tradie_field_service",
            "capability_statement": "Quote, variation, invoice support, and handover foundations.",
            "credentials": [{"title": "Electrical contractor licence", "issuer": "NSW Fair Trading", "credential_type": "licence"}],
            "business_functions": [{"function_type": "proof_of_work_handover", "is_enabled": True}],
        },
        headers=headers,
        base_url="http://control.test",
    )
    assert tradie.status_code == 201
    tradie_id = tradie.get_json()["data"]["id"]
    client.post(f"/api/control/presence/nodes/{tradie_id}/publish", headers=headers, base_url="http://control.test")

    tag = client.post(
        f"/api/control/presence/nodes/{tradie_id}/nfc-tags",
        json={"label": "NFC business card", "tag_type": "business_card", "source_code": "nfc-card", "destination_url": "/p/harbour-electrical-test?nfc=nfc-card"},
        headers=headers,
        base_url="http://control.test",
    )
    assert tag.status_code == 201
    tag_id = tag.get_json()["data"]["id"]

    nfc_hit = client.post(
        "/api/presence/public/harbour-electrical-test/nfc-hit",
        json={"source_code": "nfc-card", "source_url": "/p/harbour-electrical-test?nfc=nfc-card", "anonymous_session_id": "anon-nfc"},
        base_url="http://public.test",
    )
    assert nfc_hit.status_code == 201
    assert nfc_hit.get_json()["data"]["source_tag_id"] == tag_id

    from manara_backend_app.models import PresenceConnection, PresenceInteraction

    with app.app_context():
        assert PresenceInteraction.query.filter_by(node_id=tradie_id, interaction_type="nfc_scanned").count() == 1
        assert PresenceConnection.query.filter_by(node_id=tradie_id).count() == 0

    quote_request = client.post(
        "/api/presence/public/harbour-electrical-test/quote-request",
        json={
            "name": "Jordan Park",
            "email": "jordan@example.org",
            "phone": "+61 400 111 222",
            "job_type": "Lighting repair",
            "address_suburb": "Marrickville",
            "urgency": "soon",
            "description": "Two studio lights need replacement.",
            "access_notes": "Side gate access.",
            "budget_range": "$500-$1,000",
            "consent": True,
            "source_code": "nfc-card",
            "source_url": "/p/harbour-electrical-test?nfc=nfc-card",
        },
        base_url="http://public.test",
    )
    assert quote_request.status_code == 201
    quote_payload = quote_request.get_json()["data"]
    connection_id = quote_payload["connection_id"]
    quote_id = quote_payload["quote_id"]

    connections = client.get(
        f"/api/control/presence/nodes/{tradie_id}/connections",
        headers=headers,
        base_url="http://control.test",
    )
    assert connections.status_code == 200
    assert connections.get_json()["data"][0]["contact_email"] == "jordan@example.org"

    connection_detail = client.get(
        f"/api/control/presence/connections/{connection_id}",
        headers=headers,
        base_url="http://control.test",
    )
    assert connection_detail.status_code == 200
    assert any(row["interaction_type"] == "quote_requested" for row in connection_detail.get_json()["data"]["interactions"])

    quote_update = client.patch(
        f"/api/control/presence/quotes/{quote_id}",
        json={"status": "sent", "line_items": [{"label": "Labour", "quantity": 3, "unit_price": 120}]},
        headers=headers,
        base_url="http://control.test",
    )
    assert quote_update.status_code == 200
    assert quote_update.get_json()["data"]["line_items"][0]["total_price"] == 360

    variation = client.post(
        f"/api/control/presence/quotes/{quote_id}/variations",
        json={"title": "Add outdoor sensor", "connection_id": connection_id, "reason": "Scope changed.", "description": "Add one sensor.", "price_delta": 180},
        headers=headers,
        base_url="http://control.test",
    )
    assert variation.status_code == 201
    variation_id = variation.get_json()["data"]["id"]
    variation_update = client.patch(
        f"/api/control/presence/variations/{variation_id}",
        json={"status": "approved", "approved_by_name": "Jordan Park"},
        headers=headers,
        base_url="http://control.test",
    )
    assert variation_update.status_code == 200
    assert variation_update.get_json()["data"]["status"] == "approved"

    invoice = client.post(
        f"/api/control/presence/nodes/{tradie_id}/invoice-support",
        json={"connection_id": connection_id, "quote_id": quote_id, "external_invoice_url": "https://example.org/invoice/1", "invoice_number": "INV-1", "amount": 540},
        headers=headers,
        base_url="http://control.test",
    )
    assert invoice.status_code == 201

    handover = client.post(
        f"/api/control/presence/nodes/{tradie_id}/handovers",
        json={"connection_id": connection_id, "quote_id": quote_id, "summary": "Lighting repair handover.", "customer_acceptance_status": "pending"},
        headers=headers,
        base_url="http://control.test",
    )
    assert handover.status_code == 201

    public_tradie = client.get("/api/presence/public/harbour-electrical-test", base_url="http://public.test")
    assert public_tradie.status_code == 200
    public_data = public_tradie.get_json()["data"]
    assert public_data["display_mode"] == "tradie_profile"
    assert "connections" not in public_data
    assert "quotes" not in public_data


def test_presence_portfolio_first_templates_and_display_mode_routing():
    """Verify the four portfolio-first templates are seeded and portfolio display modes create valid nodes."""
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    headers = _headers(app)

    # --- verify all four portfolio-first templates are seeded ---
    templates = client.get("/api/control/presence/templates", headers=headers, base_url="http://control.test")
    assert templates.status_code == 200
    rows = templates.get_json()["data"]
    names = {r["name"] for r in rows}
    assert "Portfolio Presence Kit" in names
    assert "Signature Artist / Creative Presence" in names
    assert "Editorial Portfolio" in names
    assert "Studio Practice" in names

    # verify display modes on new templates
    pres_kit = next(r for r in rows if r["name"] == "Portfolio Presence Kit")
    assert pres_kit["display_mode"] == "portfolio_presence_kit"
    assert pres_kit["supports_collections"] is True

    sig_artist = next(r for r in rows if r["name"] == "Signature Artist / Creative Presence")
    assert sig_artist["display_mode"] == "signature_artist"
    assert sig_artist["supports_landing_portal"] is True

    editorial = next(r for r in rows if r["name"] == "Editorial Portfolio")
    assert editorial["display_mode"] == "editorial_portfolio"
    assert editorial["supports_collections"] is True

    studio = next(r for r in rows if r["name"] == "Studio Practice")
    assert studio["display_mode"] == "studio_practice"
    assert studio["supports_collections"] is True

    # --- create a Portfolio Presence Kit node and verify it round-trips ---
    kit_node = client.post(
        "/api/control/presence/nodes",
        json={
            "tenant_id": tenant_id,
            "slug": "test-portfolio-kit",
            "display_name": "Calla Studio",
            "headline": "Contemporary textile artist",
            "node_type": "creative",
            "display_mode": "portfolio_presence_kit",
            "plan_type": "premium",
            "visibility": "public",
            "practice_statement": "Working with warp and weft in natural dye traditions.",
            "curatorial_statement": "Selected works explore country and material memory.",
        },
        headers=headers,
        base_url="http://control.test",
    )
    assert kit_node.status_code == 201, kit_node.get_data(as_text=True)
    kit_id = kit_node.get_json()["data"]["id"]

    # publish and verify public
    client.post(f"/api/control/presence/nodes/{kit_id}/publish", headers=headers, base_url="http://control.test")
    public_kit = client.get("/api/presence/public/test-portfolio-kit", base_url="http://public.test")
    assert public_kit.status_code == 200
    pd = public_kit.get_json()["data"]
    assert pd["display_mode"] == "portfolio_presence_kit"
    assert pd["practice_statement"] == "Working with warp and weft in natural dye traditions."
    # public serializer must not expose admin-only fields
    assert "connections" not in pd
    assert "quotes" not in pd
    assert "nfc_tags" not in pd

    # --- create a Signature Artist node ---
    sig_node = client.post(
        "/api/control/presence/nodes",
        json={
            "tenant_id": tenant_id,
            "slug": "test-signature-artist",
            "display_name": "Marla Nguyen",
            "headline": "Painter and cultural practitioner",
            "node_type": "artist",
            "display_mode": "signature_artist",
            "plan_type": "premium",
            "visibility": "public",
            "practice_statement": "Oil and ground pigment. Country as canvas.",
        },
        headers=headers,
        base_url="http://control.test",
    )
    assert sig_node.status_code == 201
    sig_id = sig_node.get_json()["data"]["id"]
    client.post(f"/api/control/presence/nodes/{sig_id}/publish", headers=headers, base_url="http://control.test")
    public_sig = client.get("/api/presence/public/test-signature-artist", base_url="http://public.test")
    assert public_sig.status_code == 200
    assert public_sig.get_json()["data"]["display_mode"] == "signature_artist"

    # --- create an Editorial Portfolio node ---
    edit_node = client.post(
        "/api/control/presence/nodes",
        json={
            "tenant_id": tenant_id,
            "slug": "test-editorial-portfolio",
            "display_name": "Jasper Collier",
            "headline": "Documentary photographer",
            "node_type": "creative",
            "display_mode": "editorial_portfolio",
            "plan_type": "premium",
            "visibility": "public",
        },
        headers=headers,
        base_url="http://control.test",
    )
    assert edit_node.status_code == 201
    edit_id = edit_node.get_json()["data"]["id"]
    client.post(f"/api/control/presence/nodes/{edit_id}/publish", headers=headers, base_url="http://control.test")
    public_edit = client.get("/api/presence/public/test-editorial-portfolio", base_url="http://public.test")
    assert public_edit.status_code == 200
    assert public_edit.get_json()["data"]["display_mode"] == "editorial_portfolio"

    # --- create a Studio Practice node ---
    studio_node = client.post(
        "/api/control/presence/nodes",
        json={
            "tenant_id": tenant_id,
            "slug": "test-studio-practice",
            "display_name": "Anika Wells",
            "headline": "Sculptor and installation artist",
            "node_type": "artist",
            "display_mode": "studio_practice",
            "plan_type": "premium",
            "visibility": "public",
            "curatorial_statement": "Materiality, weight, and the unseen archive.",
        },
        headers=headers,
        base_url="http://control.test",
    )
    assert studio_node.status_code == 201
    studio_id = studio_node.get_json()["data"]["id"]
    client.post(f"/api/control/presence/nodes/{studio_id}/publish", headers=headers, base_url="http://control.test")
    public_studio = client.get("/api/presence/public/test-studio-practice", base_url="http://public.test")
    assert public_studio.status_code == 200
    assert public_studio.get_json()["data"]["display_mode"] == "studio_practice"


# ----------------------------------------------------------------------------
# /api/presence/beta/applications — public-beta setup-request persistence
# ----------------------------------------------------------------------------


def test_presence_beta_application_requires_auth():
    """Unauthenticated requests are rejected with 401, no row created."""
    app = _build_app()
    _seed_fixture(app)
    client = app.test_client()

    response = client.post(
        "/api/presence/beta/applications",
        json={"display_name": "Anonymous", "presence_type": "artist"},
        base_url="http://public.test",
    )
    assert response.status_code == 401, response.get_json()

    # Confirm no row was inserted.
    from manara_backend_app.extensions import db as _db
    from manara_backend_app.models import PresenceBetaApplication

    with app.app_context():
        assert _db.session.query(PresenceBetaApplication).count() == 0


def test_presence_beta_application_persists_authenticated_request_with_owner_safe_payload():
    """Verified Supabase user can submit a setup request; row is pending and
    the response is owner-safe (no user_id, no email leakage)."""
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()

    _create_owner_user(app, username="studio-pilot", pseudonym="studio-pilot",
                       email="pilot@example.com", node_id=tenant_id, role="participant")
    headers = _owner_headers(app, "studio-pilot", role="participant")
    response = client.post(
        "/api/presence/beta/applications",
        json={
            "display_name": "Mira Cole",
            "desired_slug": "mira-cole",
            "presence_type": "artist",
            "primary_purpose": "portfolio",
            "primary_cta": "viewing",
            "template_direction": "studio_practice",
            "visual_mood": "warm_studio",
            "location_label": "Hobart, Tasmania",
            "headline": "Textile artist working with country, dye, and weave.",
            "description": "Pilot world for a sculptor / weaver.",
            "beta_mode": "studio_assisted",
        },
        headers=headers,
        base_url="http://public.test",
    )
    assert response.status_code == 201, response.get_json()
    body = response.get_json()["data"]
    # Owner-safe shape: no internal user_id or email exposed.
    assert body["display_name"] == "Mira Cole"
    assert body["desired_slug"] == "mira-cole"
    assert body["status"] == "pending"
    assert body["beta_mode"] == "studio_assisted"
    assert "user_id" not in body
    assert "email" not in body

    from manara_backend_app.extensions import db as _db
    from manara_backend_app.models import PresenceBetaApplication

    with app.app_context():
        rows = _db.session.query(PresenceBetaApplication).all()
        assert len(rows) == 1
        # user_id is recorded server-side for follow-up review.
        assert rows[0].status == "pending"
        assert rows[0].presence_type == "artist"
        assert rows[0].template_direction == "studio_practice"


def test_presence_beta_application_rejects_unknown_enum_values():
    """Unknown enum values are rejected with 422 — keeps the table clean."""
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()

    _create_owner_user(app, username="studio-pilot", pseudonym="studio-pilot",
                       email="pilot@example.com", node_id=tenant_id, role="participant")
    headers = _owner_headers(app, "studio-pilot", role="participant")
    response = client.post(
        "/api/presence/beta/applications",
        json={
            "display_name": "Test",
            "presence_type": "definitely_not_a_type",
        },
        headers=headers,
        base_url="http://public.test",
    )
    assert response.status_code == 422, response.get_json()

    response = client.post(
        "/api/presence/beta/applications",
        json={
            "display_name": "Test",
            "primary_cta": "buy_followers",
        },
        headers=headers,
        base_url="http://public.test",
    )
    assert response.status_code == 422, response.get_json()


def test_presence_beta_application_does_not_create_presence_node_or_assign_ownership():
    """A beta application MUST NOT create a PresenceNode or assign ownership.
    It is a setup *request*, reviewed by Studio. This guards against accidental
    auto-publishing or fake ownership in v1."""
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()

    _create_owner_user(app, username="studio-pilot", pseudonym="studio-pilot",
                       email="pilot@example.com", node_id=tenant_id, role="participant")
    headers = _owner_headers(app, "studio-pilot", role="participant")
    response = client.post(
        "/api/presence/beta/applications",
        json={
            "display_name": "Pilot User",
            "desired_slug": "pilot-user",
            "presence_type": "artist",
        },
        headers=headers,
        base_url="http://public.test",
    )
    assert response.status_code == 201

    from manara_backend_app.extensions import db as _db
    from manara_backend_app.models import PresenceNode

    with app.app_context():
        # No PresenceNode created.
        assert _db.session.query(PresenceNode).filter_by(slug="pilot-user").first() is None

    # Public route does not surface the desired slug.
    public = client.get("/api/presence/public/pilot-user", base_url="http://public.test")
    assert public.status_code == 404


# ----------------------------------------------------------------------------
# /api/presence/public/nodes — safe public list endpoint (v1.1 gallery feed)
# ----------------------------------------------------------------------------


def _make_node(client, headers, *, tenant_id, slug, display_name, status="published",
               visibility="public", display_mode="profile_card", node_type="custom"):
    payload = {
        "tenant_id": tenant_id,
        "slug": slug,
        "display_name": display_name,
        "node_type": node_type,
        "display_mode": display_mode,
        "plan_type": "basic",
        "visibility": visibility,
        "headline": f"Headline for {display_name}",
        "bio": f"Public bio for {display_name}.",
    }
    if status != "published":
        payload["status"] = status
    res = client.post(
        "/api/control/presence/nodes",
        json=payload,
        headers=headers,
        base_url="http://control.test",
    )
    assert res.status_code == 201, res.get_json()
    node_id = res.get_json()["data"]["id"]
    if status == "published":
        pub = client.post(
            f"/api/control/presence/nodes/{node_id}/publish",
            headers=headers,
            base_url="http://control.test",
        )
        assert pub.status_code == 200
    return node_id


def test_public_presence_list_returns_only_published_public_nodes_with_owner_safe_payload():
    """Endpoint must return ONLY published+public rows; payload must NOT leak
    owner_user_id, tenant_id, organisation_id, or admin metadata."""
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    headers = _headers(app)

    # 1 published+public plus hidden draft / unpublished / suspended /
    # private / unlisted / archived variants.
    _make_node(client, headers, tenant_id=tenant_id, slug="gallery-published-public",
               display_name="Public Pilot", status="published", visibility="public",
               display_mode="artist_gallery", node_type="artist")
    _make_node(client, headers, tenant_id=tenant_id, slug="gallery-draft",
               display_name="Draft Pilot", status="draft", visibility="public")
    _make_node(client, headers, tenant_id=tenant_id, slug="gallery-unpublished",
               display_name="Unpublished Pilot", status="unpublished", visibility="public")
    _make_node(client, headers, tenant_id=tenant_id, slug="gallery-suspended",
               display_name="Suspended Pilot", status="suspended", visibility="public")
    _make_node(client, headers, tenant_id=tenant_id, slug="gallery-private",
               display_name="Private Pilot", status="published", visibility="private")
    _make_node(client, headers, tenant_id=tenant_id, slug="gallery-unlisted",
               display_name="Unlisted Pilot", status="published", visibility="unlisted")
    archived_id = _make_node(client, headers, tenant_id=tenant_id, slug="gallery-archived",
                             display_name="Archived Pilot", status="published", visibility="public")
    arch = client.post(
        f"/api/control/presence/nodes/{archived_id}/archive",
        headers=headers,
        base_url="http://control.test",
    )
    assert arch.status_code == 200, arch.get_json()

    res = client.get("/api/presence/public/nodes", base_url="http://public.test")
    assert res.status_code == 200, res.get_json()
    data = res.get_json()["data"]
    slugs = {item["slug"] for item in data["items"]}

    # Only the published+public+non-archived row appears.
    assert "gallery-published-public" in slugs
    assert "gallery-draft" not in slugs
    assert "gallery-unpublished" not in slugs
    assert "gallery-suspended" not in slugs
    assert "gallery-private" not in slugs
    assert "gallery-unlisted" not in slugs
    assert "gallery-archived" not in slugs

    # Owner-safe payload check.
    public_pilot = next(item for item in data["items"] if item["slug"] == "gallery-published-public")
    forbidden_keys = {
        "owner_user_id", "tenant_id", "organisation_id",
        "procurement_contact_email", "compliance_notes",
        "abn_acn_or_registration", "connections", "nfc_tags",
        "quotes", "variations", "invoice_support_records",
        "handovers", "directory_ready", "map_ready",
        "archive_ready", "marketplace_ready",
    }
    assert forbidden_keys.isdisjoint(public_pilot.keys()), (
        f"public list leaked private fields: {forbidden_keys & public_pilot.keys()}"
    )


def test_wrong_host_presence_page_redirects_to_frontend_origin():
    app = _build_app()
    app.config["PRESENCE_PUBLIC_ORIGIN"] = "https://presence-gilt.vercel.app"
    client = app.test_client()

    response = client.get("/p/jafar", base_url="https://anu-back-end.vercel.app")

    assert response.status_code == 302
    assert response.headers["Location"] == "https://presence-gilt.vercel.app/p/jafar"


def test_wrong_host_presence_page_redirect_preserves_query_string():
    app = _build_app()
    app.config["PRESENCE_PUBLIC_ORIGIN"] = "https://presence-gilt.vercel.app"
    client = app.test_client()

    response = client.get("/p/jafar?source=nfc-card&sid=abc", base_url="https://anu-back-end.vercel.app")

    assert response.status_code == 302
    assert response.headers["Location"] == "https://presence-gilt.vercel.app/p/jafar?source=nfc-card&sid=abc"


def test_wrong_host_presence_work_and_collection_paths_redirect():
    app = _build_app()
    app.config["PRESENCE_PUBLIC_ORIGIN"] = "https://presence-gilt.vercel.app"
    client = app.test_client()

    work = client.get("/p/jafar/works/abc", base_url="https://anu-back-end.vercel.app")
    collection = client.get("/p/jafar/collections/def", base_url="https://anu-back-end.vercel.app")

    assert work.status_code == 302
    assert work.headers["Location"] == "https://presence-gilt.vercel.app/p/jafar/works/abc"
    assert collection.status_code == 302
    assert collection.headers["Location"] == "https://presence-gilt.vercel.app/p/jafar/collections/def"


def test_wrong_host_redirect_does_not_affect_public_api_route():
    app = _build_app()
    app.config["PRESENCE_PUBLIC_ORIGIN"] = "https://presence-gilt.vercel.app"
    client = app.test_client()

    response = client.get("/api/presence/public/jafar", base_url="https://anu-back-end.vercel.app")

    assert response.status_code == 404
    assert "Location" not in response.headers


def test_public_presence_list_supports_pagination_and_filters():
    """limit + offset + presence_type / display_mode filters work."""
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    headers = _headers(app)

    for i in range(3):
        _make_node(client, headers, tenant_id=tenant_id, slug=f"artist-pilot-{i}",
                   display_name=f"Artist {i}", status="published", visibility="public",
                   display_mode="artist_gallery", node_type="artist")
    for i in range(2):
        _make_node(client, headers, tenant_id=tenant_id, slug=f"venue-pilot-{i}",
                   display_name=f"Venue {i}", status="published", visibility="public",
                   display_mode="venue_profile", node_type="venue")

    # Filter by display_mode
    res = client.get("/api/presence/public/nodes?display_mode=venue_profile",
                     base_url="http://public.test")
    items = res.get_json()["data"]["items"]
    assert all(it["display_mode"] == "venue_profile" for it in items)
    assert len(items) >= 2

    # Pagination — limit 2
    res2 = client.get("/api/presence/public/nodes?limit=2&offset=0", base_url="http://public.test")
    page = res2.get_json()["data"]
    assert len(page["items"]) == 2
    assert page["limit"] == 2
    assert page["total"] >= 5

    # Limit hard-capped at 50.
    res3 = client.get("/api/presence/public/nodes?limit=9999", base_url="http://public.test")
    assert res3.get_json()["data"]["limit"] == 50


def test_public_presence_list_search_matches_display_name_and_headline_only():
    """Search must match display_name / headline only — never bio / private fields."""
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    headers = _headers(app)

    _make_node(client, headers, tenant_id=tenant_id, slug="haunted-river",
               display_name="Haunted River Studio", status="published", visibility="public",
               display_mode="studio_practice", node_type="artist")
    _make_node(client, headers, tenant_id=tenant_id, slug="quiet-house",
               display_name="Quiet House", status="published", visibility="public",
               display_mode="practitioner_profile", node_type="practitioner")

    res = client.get("/api/presence/public/nodes?search=haunted", base_url="http://public.test")
    items = res.get_json()["data"]["items"]
    assert {it["slug"] for it in items} == {"haunted-river"}

    res = client.get("/api/presence/public/nodes?search=quiet", base_url="http://public.test")
    items = res.get_json()["data"]["items"]
    assert {it["slug"] for it in items} == {"quiet-house"}


def test_public_presence_slug_hides_archived_timestamp_even_if_status_is_published():
    """Direct public slug route also honours archived_at, not just status."""
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    headers = _headers(app)

    node_id = _make_node(
        client,
        headers,
        tenant_id=tenant_id,
        slug="published-but-archived",
        display_name="Published But Archived",
        status="published",
        visibility="public",
    )

    from manara_backend_app.extensions import db as _db
    from manara_backend_app.models import PresenceNode
    from manara_backend_app.time_utils import now_utc

    with app.app_context():
        node = _db.session.query(PresenceNode).get(node_id)
        node.status = "published"
        node.visibility = "public"
        node.archived_at = now_utc()
        _db.session.commit()

    res = client.get("/api/presence/public/published-but-archived", base_url="http://public.test")
    assert res.status_code == 404


# ----------------------------------------------------------------------------
# /api/presence/owner/beta/start — safe self-service draft creation (v1.1)
# ----------------------------------------------------------------------------


def test_owner_beta_start_requires_auth():
    """Unauthenticated calls are rejected with 401, no node created."""
    app = _build_app()
    _seed_fixture(app)
    client = app.test_client()

    res = client.post(
        "/api/presence/owner/beta/start",
        json={"display_name": "Anon"},
        base_url="http://public.test",
    )
    assert res.status_code == 401, res.get_json()


def test_owner_beta_start_creates_draft_private_unpublished_node_and_assigns_owner():
    """Verified user creates exactly one draft+private+unpublished node owned by them."""
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()

    user_id = _create_owner_user(
        app, username="beta-pilot", pseudonym="beta-pilot",
        email="beta@example.com", node_id=tenant_id, role="participant",
    )
    headers = _owner_headers(app, "beta-pilot", role="participant")

    res = client.post(
        "/api/presence/owner/beta/start",
        json={
            "display_name": "Mira Cole",
            "desired_slug": "mira-cole-pilot",
            "presence_type": "artist",
            "primary_purpose": "portfolio",
            "primary_cta": "viewing",
            "template_direction": "studio_practice",
            "visual_mood": "warm_studio",
            "headline": "Textile artist working with country, dye, and weave.",
            "description": "A pilot draft Presence.",
            "location_label": "Hobart, Tasmania",
            "beta_mode": "draft_self_build",
        },
        headers=headers,
        base_url="http://public.test",
    )
    assert res.status_code == 201, res.get_json()
    body = res.get_json()["data"]
    assert body["display_name"] == "Mira Cole"
    assert body["slug"] == "mira-cole-pilot"
    assert body["status"] == "draft"
    assert body["visibility"] == "private"
    assert body["published_at"] is None
    assert body["node_type"] == "artist"
    assert body["headline"] == "Textile artist working with country, dye, and weave."
    assert body["bio"] == "A pilot draft Presence."
    assert body["location_label"] == "Hobart, Tasmania"
    assert body["primary_cta_label"] == "Request a viewing"
    # template_direction → display_mode mapping
    assert body["display_mode"] == "studio_practice"
    # visual_mood persisted
    assert body["visual_mood"] == "warm_studio"
    # theme_config carries the onboarding intent
    intent = body.get("theme_config", {}).get("beta_intent", {})
    assert intent.get("template_direction") == "studio_practice"
    assert intent.get("visual_mood") == "warm_studio"
    assert intent.get("primary_purpose") == "portfolio"
    assert intent.get("primary_cta") == "viewing"
    assert intent.get("beta_mode") == "draft_self_build"

    # Server-side: node row is exactly as expected, owned by the user.
    from manara_backend_app.extensions import db as _db
    from manara_backend_app.models import PresenceNode

    with app.app_context():
        node = _db.session.query(PresenceNode).filter_by(slug="mira-cole-pilot").one()
        assert node.status == "draft"
        assert node.visibility == "private"
        assert node.published_at is None
        assert node.owner_user_id == user_id


def test_owner_beta_start_valid_supabase_user_without_local_user_creates_private_draft():
    """ANU Supabase users without a local row are provisioned and get a private draft."""
    app = _build_app()
    _seed_fixture(app)
    client = app.test_client()
    subject = "anu-beta-start-owner"
    email = "anu-beta-start-owner@example.com"
    headers = _supabase_owner_headers(
        app,
        sub=subject,
        email=email,
        display_name="ANU Beta Owner",
    )

    res = client.post(
        "/api/presence/owner/beta/start",
        json={
            "display_name": "ANU Native Draft",
            "desired_slug": "anu-native-draft",
            "presence_type": "artist",
            "primary_cta": "contact",
            "template_direction": "studio_practice",
            "visual_mood": "warm_studio",
            "headline": "A private draft created by an ANU Supabase user.",
            "description": "Draft created during ANU-native Presence onboarding.",
        },
        headers=headers,
        base_url="http://public.test",
    )

    assert res.status_code == 201, res.get_json()
    body = res.get_json()["data"]
    assert body["slug"] == "anu-native-draft"
    assert body["status"] == "draft"
    assert body["visibility"] == "private"
    assert body["published_at"] is None

    from manara_backend_app.extensions import db as _db
    from manara_backend_app.models import PresenceNode, User

    with app.app_context():
        user = _db.session.query(User).filter_by(global_subject_id=subject).one()
        node = _db.session.query(PresenceNode).filter_by(slug="anu-native-draft").one()
        assert user.email == email
        assert user.role == "participant"
        assert node.owner_user_id == user.id
        assert node.status == "draft"
        assert node.visibility == "private"
        assert node.published_at is None

    public = client.get("/api/presence/public/anu-native-draft", base_url="http://public.test")
    assert public.status_code == 404


def test_owner_beta_start_public_routes_hide_the_draft():
    """Public single-slug + list endpoints must hide the new draft."""
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    _create_owner_user(
        app, username="beta-pilot", pseudonym="beta-pilot",
        email="beta@example.com", node_id=tenant_id, role="participant",
    )
    headers = _owner_headers(app, "beta-pilot", role="participant")

    res = client.post(
        "/api/presence/owner/beta/start",
        json={
            "display_name": "Quiet Draft",
            "desired_slug": "quiet-draft",
            "presence_type": "practitioner",
            "template_direction": "practitioner_pathway",
            "visual_mood": "care_path",
        },
        headers=headers,
        base_url="http://public.test",
    )
    assert res.status_code == 201

    # Public single-slug route → 404
    public = client.get("/api/presence/public/quiet-draft", base_url="http://public.test")
    assert public.status_code == 404

    # Public list endpoint never includes it
    list_res = client.get("/api/presence/public/nodes", base_url="http://public.test")
    items = list_res.get_json()["data"]["items"]
    assert "quiet-draft" not in {it["slug"] for it in items}


def test_owner_beta_start_draft_can_be_explicitly_published_to_public_route():
    """A private beta draft is hidden until owner publish; publish makes it public."""
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    _create_owner_user(
        app, username="publish-pilot", pseudonym="publish-pilot",
        email="publish@example.com", node_id=tenant_id, role="participant",
    )
    headers = _owner_headers(app, "publish-pilot", role="participant")

    res = client.post(
        "/api/presence/owner/beta/start",
        json={"display_name": "Publish Draft", "desired_slug": "publish-draft", "presence_type": "artist"},
        headers=headers,
        base_url="http://public.test",
    )
    assert res.status_code == 201
    node_id = res.get_json()["data"]["id"]
    assert client.get("/api/presence/public/publish-draft", base_url="http://public.test").status_code == 404

    published = client.post(
        f"/api/presence/owner/nodes/{node_id}/publish",
        headers=headers,
        base_url="http://public.test",
    )
    assert published.status_code == 200, published.get_json()
    body = published.get_json()["data"]
    assert body["status"] == "published"
    assert body["visibility"] == "public"
    assert body["published_at"] is not None
    assert client.get("/api/presence/public/publish-draft", base_url="http://public.test").status_code == 200


def test_owner_beta_start_rejects_duplicate_slug():
    """Explicitly-requested slug that already exists → 409 (don't silently mutate)."""
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    headers_admin = _headers(app)
    # Create an existing public node owned by the seed admin.
    res_admin = client.post(
        "/api/control/presence/nodes",
        json={
            "tenant_id": tenant_id,
            "slug": "taken-slug",
            "display_name": "Taken Slug Pilot",
            "node_type": "artist",
            "display_mode": "artist_gallery",
            "plan_type": "basic",
            "visibility": "public",
        },
        headers=headers_admin,
        base_url="http://control.test",
    )
    assert res_admin.status_code == 201

    # Now a different verified beta user tries the same slug.
    _create_owner_user(
        app, username="beta-pilot-b", pseudonym="beta-pilot-b",
        email="b@example.com", node_id=tenant_id, role="participant",
    )
    headers_b = _owner_headers(app, "beta-pilot-b", role="participant")
    dup = client.post(
        "/api/presence/owner/beta/start",
        json={"display_name": "Trying same", "desired_slug": "taken-slug", "presence_type": "artist"},
        headers=headers_b,
        base_url="http://public.test",
    )
    assert dup.status_code == 409, dup.get_json()
    assert dup.get_json()["error"]["code"] == "duplicate_slug"


def test_owner_beta_start_rejects_unusable_desired_slug():
    """Requested slugs must normalize to at least one public slug token."""
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    user_id = _create_owner_user(
        app, username="bad-slug-pilot", pseudonym="bad-slug-pilot",
        email="bad-slug@example.com", node_id=tenant_id, role="participant",
    )
    headers = _owner_headers(app, "bad-slug-pilot", role="participant")

    res = client.post(
        "/api/presence/owner/beta/start",
        json={"display_name": "Bad Slug", "desired_slug": "!!!", "presence_type": "artist"},
        headers=headers,
        base_url="http://public.test",
    )
    assert res.status_code == 422, res.get_json()
    assert res.get_json()["error"]["code"] == "validation_error"

    from manara_backend_app.extensions import db as _db
    from manara_backend_app.models import PresenceNode

    with app.app_context():
        assert _db.session.query(PresenceNode).filter_by(owner_user_id=user_id).count() == 0


def test_owner_beta_start_one_starter_per_user_rule():
    """A user with an existing PresenceNode cannot create another starter."""
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    _create_owner_user(
        app, username="repeat-pilot", pseudonym="repeat-pilot",
        email="repeat@example.com", node_id=tenant_id, role="participant",
    )
    headers = _owner_headers(app, "repeat-pilot", role="participant")

    first = client.post(
        "/api/presence/owner/beta/start",
        json={"display_name": "First", "desired_slug": "repeat-first", "presence_type": "artist"},
        headers=headers,
        base_url="http://public.test",
    )
    assert first.status_code == 201

    second = client.post(
        "/api/presence/owner/beta/start",
        json={"display_name": "Second", "desired_slug": "repeat-second", "presence_type": "artist"},
        headers=headers,
        base_url="http://public.test",
    )
    assert second.status_code == 409, second.get_json()
    assert second.get_json()["error"]["code"] == "duplicate_starter"


def test_owner_beta_start_owner_can_fetch_own_draft_via_owner_endpoint_cross_owner_cannot():
    """Owner can GET /api/presence/owner/nodes/<id> — cross-owner gets 403."""
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    _create_owner_user(
        app, username="owner-a", pseudonym="owner-a",
        email="a@example.com", node_id=tenant_id, role="participant",
    )
    _create_owner_user(
        app, username="owner-b", pseudonym="owner-b",
        email="b@example.com", node_id=tenant_id, role="participant",
    )
    headers_a = _owner_headers(app, "owner-a", role="participant")
    headers_b = _owner_headers(app, "owner-b", role="participant")

    res = client.post(
        "/api/presence/owner/beta/start",
        json={"display_name": "Owner A draft", "desired_slug": "owner-a-draft", "presence_type": "artist"},
        headers=headers_a,
        base_url="http://public.test",
    )
    assert res.status_code == 201
    node_id = res.get_json()["data"]["id"]

    # Owner A can fetch
    own = client.get(f"/api/presence/owner/nodes/{node_id}", headers=headers_a, base_url="http://public.test")
    assert own.status_code == 200

    # Owner B cannot fetch
    cross = client.get(f"/api/presence/owner/nodes/{node_id}", headers=headers_b, base_url="http://public.test")
    assert cross.status_code == 403


def test_cross_owner_access_still_denied_after_auto_provision():
    """Auto-provisioned Presence owners cannot fetch each other's drafts."""
    app = _build_app()
    _seed_fixture(app)
    client = app.test_client()
    headers_a = _supabase_owner_headers(
        app,
        sub="anu-auto-owner-a",
        email="anu-auto-owner-a@example.com",
        display_name="Auto Owner A",
    )
    headers_b = _supabase_owner_headers(
        app,
        sub="anu-auto-owner-b",
        email="anu-auto-owner-b@example.com",
        display_name="Auto Owner B",
    )

    node_a = client.post(
        "/api/presence/owner/beta/start",
        json={"display_name": "Auto Owner A", "desired_slug": "auto-owner-a", "presence_type": "artist"},
        headers=headers_a,
        base_url="http://public.test",
    )
    assert node_a.status_code == 201, node_a.get_json()

    node_b = client.post(
        "/api/presence/owner/beta/start",
        json={"display_name": "Auto Owner B", "desired_slug": "auto-owner-b", "presence_type": "artist"},
        headers=headers_b,
        base_url="http://public.test",
    )
    assert node_b.status_code == 201, node_b.get_json()

    node_a_id = node_a.get_json()["data"]["id"]
    own = client.get(f"/api/presence/owner/nodes/{node_a_id}", headers=headers_a, base_url="http://public.test")
    cross = client.get(f"/api/presence/owner/nodes/{node_a_id}", headers=headers_b, base_url="http://public.test")

    assert own.status_code == 200, own.get_json()
    assert cross.status_code == 403


def test_presence_public_routes_still_hide_auto_created_draft():
    """Auto-provisioned draft owners do not change public route visibility rules."""
    app = _build_app()
    _seed_fixture(app)
    client = app.test_client()
    headers = _supabase_owner_headers(
        app,
        sub="anu-public-hide-owner",
        email="anu-public-hide-owner@example.com",
    )

    draft = client.post(
        "/api/presence/owner/beta/start",
        json={"display_name": "Hidden Auto Draft", "desired_slug": "hidden-auto-draft", "presence_type": "artist"},
        headers=headers,
        base_url="http://public.test",
    )
    assert draft.status_code == 201, draft.get_json()

    public_slug = client.get("/api/presence/public/hidden-auto-draft", base_url="http://public.test")
    assert public_slug.status_code == 404

    public_list = client.get("/api/presence/public/nodes", base_url="http://public.test")
    assert public_list.status_code == 200
    slugs = {
        item["slug"]
        for item in public_list.get_json()["data"]["items"]
        if isinstance(item, dict) and "slug" in item
    }
    assert "hidden-auto-draft" not in slugs


def test_owner_beta_start_persists_full_self_serve_onboarding_payload():
    """Self-serve wizard fields (intensity, world_statement, proof_note) persist
    safely into theme_config.beta_intent and proof_summary respectively."""
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    _create_owner_user(
        app, username="wizard-pilot", pseudonym="wizard-pilot",
        email="wizard@example.com", node_id=tenant_id, role="participant",
    )
    headers = _owner_headers(app, "wizard-pilot", role="participant")
    res = client.post(
        "/api/presence/owner/beta/start",
        json={
            "display_name": "Mira Cole",
            "desired_slug": "mira-cole-wizard",
            "presence_type": "artist",
            "primary_purpose": "portfolio",
            "primary_cta": "viewing",
            "template_direction": "studio_practice",
            "visual_mood": "warm_studio",
            "intensity": "atmospheric",
            "headline": "Textile artist working with country, dye, and weave.",
            "description": "",
            "world_statement": "A studio practice rooted in plant dye and slow weave.",
            "proof_note": "Fifteen years of commissioned weavings in private and public collections.",
            "location_label": "Hobart, Tasmania",
            "beta_mode": "draft_self_build",
        },
        headers=headers,
        base_url="http://public.test",
    )
    assert res.status_code == 201, res.get_json()
    body = res.get_json()["data"]
    intent = body.get("theme_config", {}).get("beta_intent", {})
    assert intent.get("intensity") == "atmospheric"
    assert intent.get("world_statement", "").startswith("A studio practice rooted in")
    assert intent.get("proof_note", "").startswith("Fifteen years of commissioned weavings")
    assert intent.get("onboarding_version", "").startswith("v2-self-serve")
    assert intent.get("launch_mode") == "self_serve_draft"
    # world_statement filled bio because description was empty
    assert body["bio"].startswith("A studio practice rooted in")
    # proof_note persisted to public proof_summary field
    assert body.get("proof_summary", "").startswith("Fifteen years of commissioned weavings")
    # Status guarantees still hold
    assert body["status"] == "draft"
    assert body["visibility"] == "private"


def test_owner_beta_start_rejects_unknown_intensity():
    """Unknown intensity values are rejected with 422."""
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    _create_owner_user(
        app, username="bad-intensity", pseudonym="bad-intensity",
        email="bi@example.com", node_id=tenant_id, role="participant",
    )
    headers = _owner_headers(app, "bad-intensity", role="participant")
    res = client.post(
        "/api/presence/owner/beta/start",
        json={
            "display_name": "Bad",
            "desired_slug": "bad-intensity",
            "presence_type": "artist",
            "intensity": "loud_and_proud",
        },
        headers=headers,
        base_url="http://public.test",
    )
    assert res.status_code == 422


def test_owner_beta_start_owner_safe_payload_no_admin_only_fields():
    """Returned payload must not include admin-only or cross-owner fields."""
    app = _build_app()
    tenant_id, _ = _seed_fixture(app)
    client = app.test_client()
    _create_owner_user(
        app, username="safe-pilot", pseudonym="safe-pilot",
        email="safe@example.com", node_id=tenant_id, role="participant",
    )
    headers = _owner_headers(app, "safe-pilot", role="participant")
    res = client.post(
        "/api/presence/owner/beta/start",
        json={"display_name": "Safe", "desired_slug": "safe-pilot", "presence_type": "artist"},
        headers=headers,
        base_url="http://public.test",
    )
    assert res.status_code == 201
    body = res.get_json()["data"]
    # Must not include the per-tenant organisation aggregate or cross-owner data.
    assert body.get("organisation") is None or "organisation" not in body
    assert "connections" not in body or body["connections"] == []
    assert "quotes" not in body or body["quotes"] == []
    assert "variations" not in body or body["variations"] == []
    assert "invoice_support_records" not in body or body["invoice_support_records"] == []
    assert "handovers" not in body or body["handovers"] == []
