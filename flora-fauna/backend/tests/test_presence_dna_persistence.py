"""Presence DNA persistence (Pass 2).

Covers:
- create-with-DNA via control-plane
- update-DNA via PATCH
- public serializer exposes metadata.presence_dna
- validator rejects shape violations and oversize payloads
- seed_presence_dna_demo_data is idempotent and writes DNA for the six demo slugs
"""

import os
from datetime import timedelta

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-presence-dna-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-presence-dna-1234"

from flask_jwt_extended import create_access_token  # noqa: E402

from backend_factory import load_create_app  # noqa: E402


CONTROL_SECRET = "presence-dna-control-secret"


PRESENCE_SCOPES = [
    "presence.node.create",
    "presence.node.read",
    "presence.node.update",
    "presence.node.publish",
]


VALID_DNA = {
    "entity": {"entity_type": "individual", "public_name": "Test", "relationship_to_work": "maker"},
    "practice": {"field": "visual_art", "practice_mode": "commission", "work_rhythm": "project_based"},
    "audience": {"primary_audience": "collectors", "audience_temperature": "referred", "decision_need": "taste"},
    "goal": {"primary_goal": "commissions", "secondary_goals": ["press"], "conversion_style": "editorial"},
    "personality": {"temperament": "refined", "energy": "still", "status_signal": "premium"},
    "proof": {"proof_type": ["portfolio"], "proof_density": "moderate", "proof_position": "after_story"},
    "visual": {"references": [], "palette_mode": "gallery_white", "texture": "paper", "image_treatment": "gallery_matte"},
    "composition": {"entry_type": "work_first", "section_rhythm": "gallery_flow", "navigation_mode": "anchor_nav"},
    "signature": {"signature_module": "gallery_wall", "signature_intensity": "featured"},
}


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
            "CONTROL_PLANE_ALLOWED_ROLES": ["platform_admin"],
            "CONTROL_REQUIRE_TOKEN_GRANT": False,
            "CONTROL_PLANE_JWT_AUDIENCE": "control",
        }
    )


def _seed_tenant(app):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, User

    with app.app_context():
        tenant = Node(name="Tenant DNA", slug="tenant-dna", status="active")
        admin = User(
            username="dna-admin",
            pseudonym="DNA Admin",
            email="dna-admin@example.com",
            password="hash",
            role="platform_admin",
        )
        db.session.add_all([tenant, admin])
        db.session.commit()
        return tenant.id


def _headers(app, *, scopes=None):
    with app.app_context():
        token = create_access_token(
            identity="control::dna-admin",
            additional_claims={
                "aud": "control",
                "token_use": "control",
                "requires_mfa": True,
                "role": "platform_admin",
                "scp": scopes or PRESENCE_SCOPES,
            },
            expires_delta=timedelta(minutes=30),
        )
    return {"Authorization": f"Bearer {token}", "X-Control-Plane-Secret": CONTROL_SECRET}


def _node_payload(tenant_id, **extra):
    base = {
        "tenant_id": tenant_id,
        "slug": "test-dna-room",
        "display_name": "Test DNA Room",
        "headline": "A persistence test",
        "node_type": "artist",
        "display_mode": "artist_gallery",
        "plan_type": "premium",
        "visibility": "public",
    }
    base.update(extra)
    return base


def test_create_with_presence_dna_persists_and_serializes():
    app = _build_app()
    tenant_id = _seed_tenant(app)
    client = app.test_client()
    headers = _headers(app)

    create = client.post(
        "/api/control/presence/nodes",
        json=_node_payload(tenant_id, presence_dna=VALID_DNA),
        headers=headers,
        base_url="http://control.test",
    )
    assert create.status_code == 201, create.get_json()
    body = create.get_json()["data"]
    assert body["metadata"]["presence_dna"]["practice"]["field"] == "visual_art"
    assert body["metadata"]["presence_dna"]["signature"]["signature_module"] == "gallery_wall"

    node_id = body["id"]
    publish = client.post(
        f"/api/control/presence/nodes/{node_id}/publish",
        headers=headers,
        base_url="http://control.test",
    )
    assert publish.status_code == 200

    public = client.get(f"/api/presence/public/{body['slug']}")
    assert public.status_code == 200, public.get_json()
    public_body = public.get_json()["data"]
    assert public_body["metadata"]["presence_dna"]["visual"]["image_treatment"] == "gallery_matte"


def test_update_replaces_presence_dna():
    app = _build_app()
    tenant_id = _seed_tenant(app)
    client = app.test_client()
    headers = _headers(app)

    create = client.post(
        "/api/control/presence/nodes",
        json=_node_payload(tenant_id, slug="patch-dna", presence_dna=VALID_DNA),
        headers=headers,
        base_url="http://control.test",
    )
    assert create.status_code == 201
    node_id = create.get_json()["data"]["id"]

    new_dna = {**VALID_DNA, "signature": {"signature_module": "quote_oracle", "signature_intensity": "hero_level"}}
    patch = client.patch(
        f"/api/control/presence/nodes/{node_id}",
        json={"presence_dna": new_dna},
        headers=headers,
        base_url="http://control.test",
    )
    assert patch.status_code == 200, patch.get_json()
    updated = patch.get_json()["data"]
    assert updated["metadata"]["presence_dna"]["signature"]["signature_module"] == "quote_oracle"
    assert updated["metadata"]["presence_dna"]["signature"]["signature_intensity"] == "hero_level"


def test_invalid_presence_dna_rejected():
    app = _build_app()
    tenant_id = _seed_tenant(app)
    client = app.test_client()
    headers = _headers(app)

    # Wrong shape on a category — must be an object, not a string.
    bad = client.post(
        "/api/control/presence/nodes",
        json=_node_payload(
            tenant_id,
            slug="bad-dna",
            presence_dna={"entity": "not-an-object"},
        ),
        headers=headers,
        base_url="http://control.test",
    )
    assert bad.status_code == 400

    # Invalid source enum.
    bad_source = client.post(
        "/api/control/presence/nodes",
        json=_node_payload(
            tenant_id,
            slug="bad-source",
            presence_dna={**VALID_DNA, "source": "never_heard_of_it"},
        ),
        headers=headers,
        base_url="http://control.test",
    )
    assert bad_source.status_code == 400


def test_oversize_presence_dna_rejected():
    app = _build_app()
    tenant_id = _seed_tenant(app)
    client = app.test_client()
    headers = _headers(app)

    huge_notes = {"notes": ["x" * 2000] * 9}  # well over the 16 KiB cap, also caught by notes count cap first
    huge_practice = {
        **VALID_DNA,
        "practice": {**VALID_DNA["practice"], "filler": "y" * 20_000},
    }

    huge = client.post(
        "/api/control/presence/nodes",
        json=_node_payload(tenant_id, slug="huge-dna", presence_dna=huge_practice),
        headers=headers,
        base_url="http://control.test",
    )
    assert huge.status_code == 400

    # Notes shape: must be a list of strings; ensure non-strings are rejected.
    bad_notes = client.post(
        "/api/control/presence/nodes",
        json=_node_payload(
            tenant_id,
            slug="bad-notes",
            presence_dna={**VALID_DNA, "notes": [123]},
        ),
        headers=headers,
        base_url="http://control.test",
    )
    assert bad_notes.status_code == 400


def test_seed_presence_dna_demo_data_is_idempotent():
    app = _build_app()
    _seed_tenant(app)
    with app.app_context():
        from manara_backend_app.extensions import db
        from manara_backend_app.models import PresenceNode
        from manara_backend_app.services.presence_service import (
            seed_presence_dna_demo_data,
            seed_presence_templates,
        )

        seed_presence_templates()
        db.session.commit()

        first = seed_presence_dna_demo_data()
        db.session.commit()
        assert {row["slug"] for row in first["rooms"]} == {
            "rooms-underground-dj",
            "rooms-gallery-painter",
            "rooms-material-carpenter",
            "rooms-local-carpenter",
            "rooms-community-healer",
            "rooms-sharp-consultant",
        }
        assert all(row["action"] == "created" for row in first["rooms"])

        # Each seeded node has presence_dna in node_metadata.
        for slug in [row["slug"] for row in first["rooms"]]:
            node = PresenceNode.query.filter_by(slug=slug).first()
            assert node is not None
            dna = (node.node_metadata or {}).get("presence_dna")
            assert dna and "practice" in dna and "signature" in dna

        # Second run: idempotent, all actions become metadata_updated.
        second = seed_presence_dna_demo_data()
        db.session.commit()
        assert all(row["action"] == "metadata_updated" for row in second["rooms"])

        # No duplicates created.
        assert PresenceNode.query.filter_by(slug="rooms-underground-dj").count() == 1


def test_two_carpenters_have_distinct_persisted_dna():
    """Pass 1 proof case carried into Pass 2: persisted DNA must still
    distinguish the two carpenter rooms after seeding."""
    app = _build_app()
    _seed_tenant(app)
    with app.app_context():
        from manara_backend_app.extensions import db
        from manara_backend_app.models import PresenceNode
        from manara_backend_app.services.presence_service import (
            seed_presence_dna_demo_data,
            seed_presence_templates,
        )

        seed_presence_templates()
        db.session.commit()
        seed_presence_dna_demo_data()
        db.session.commit()

        material = PresenceNode.query.filter_by(slug="rooms-material-carpenter").first()
        local = PresenceNode.query.filter_by(slug="rooms-local-carpenter").first()
        assert material is not None and local is not None

        m_dna = material.node_metadata["presence_dna"]
        l_dna = local.node_metadata["presence_dna"]

        # Same field, deliberately different worlds.
        assert m_dna["practice"]["field"] == l_dna["practice"]["field"] == "building_trade"
        assert m_dna["signature"]["signature_module"] != l_dna["signature"]["signature_module"]
        assert m_dna["visual"]["palette_mode"] != l_dna["visual"]["palette_mode"]
        assert m_dna["composition"]["entry_type"] != l_dna["composition"]["entry_type"]
        assert m_dna["personality"]["status_signal"] != l_dna["personality"]["status_signal"]
