import os
from datetime import timedelta

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-manifest-authoring-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-manifest-authoring-1234"

from flask_jwt_extended import create_access_token  # noqa: E402

from backend_factory import load_create_app  # noqa: E402


def _build_app():
    create_app = load_create_app()
    return create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
            "CONTROL_PLANE_HOSTS": ["control.test"],
            "CONTROL_PLANE_ALLOWED_ROLES": ["platform_admin", "node_admin"],
            "CONTROL_REQUIRE_TOKEN_GRANT": False,
            "CONTROL_PLANE_JWT_AUDIENCE": "control",
        }
    )


def _issue_control_headers(
    app,
    username: str,
    role: str = "platform_admin",
    *,
    node_id: int | None = None,
    managed_node_ids: list[int] | None = None,
) -> dict[str, str]:
    with app.app_context():
        claims = {
            "aud": "control",
            "token_use": "control",
            "requires_mfa": True,
            "role": role,
            "scp": ["sites:manifest:read", "sites:manifest:write", "sites:tenants:read"],
        }
        if node_id is not None:
            claims["node_id"] = node_id
        if managed_node_ids is not None:
            claims["managed_node_ids"] = managed_node_ids

        token = create_access_token(
            identity=f"control::{username}",
            additional_claims=claims,
            expires_delta=timedelta(minutes=30),
        )
    return {"Authorization": f"Bearer {token}"}


def _seed_node(app):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, NodeConfig, NodeDomain, User

    with app.app_context():
        user = User(
            username="control-admin",
            pseudonym="Control Admin",
            email="control-admin@example.com",
            password="hash",
            role="platform_admin",
        )
        node = Node(name="Mudyin", slug="mudyin", status="active")
        db.session.add_all([user, node])
        db.session.flush()

        db.session.add(NodeDomain(node_id=node.id, domain="mudyin.example.com", status="active", tls_ready=True))
        db.session.add(
            NodeConfig(
                node_id=node.id,
                config_json={
                    "public_site_manifest": {
                        "site_key": "mudyin-public",
                        "site_name": "Mudyin Published",
                        "tagline": "Published tagline",
                        "canonical_domains": ["immutable.example.com"],
                        "preview_host": "immutable.preview.example.com",
                        "nav_items": [{"label": "Trust", "href": "/trust", "module": "trust"}],
                        "enabled_public_modules": ["trust", "archive"],
                        "footer_links": [{"label": "Privacy", "href": "/privacy"}],
                        "legal_links": {"privacy": "/privacy", "terms": "/terms", "code_of_conduct": "/code-of-conduct"},
                        "trust_links": {"trust_center": "/trust", "transparency": "/transparency", "archive": "/archive"},
                        "contact": {"email": "hello@mudyin.example", "public_contact_url": "/contact", "location_label": "Sydney"},
                    }
                },
            )
        )
        db.session.commit()
        return node.id


def _seed_nodes_with_delegated_operator(app):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, NodeConfig, NodeDomain, User

    with app.app_context():
        delegated = User(
            username="tenant-operator",
            pseudonym="Tenant Operator",
            email="tenant-operator@example.com",
            password="hash",
            role="node_admin",
        )
        db.session.add(delegated)
        db.session.flush()

        node_a = Node(name="Tenant A", slug="tenant-a", status="active")
        node_b = Node(name="Tenant B", slug="tenant-b", status="active")
        db.session.add_all([node_a, node_b])
        db.session.flush()

        delegated.node_id = node_a.id

        db.session.add_all(
            [
                NodeDomain(node_id=node_a.id, domain="tenant-a.example.com", status="active", tls_ready=True),
                NodeDomain(node_id=node_b.id, domain="tenant-b.example.com", status="active", tls_ready=True),
                NodeConfig(
                    node_id=node_a.id,
                    config_json={
                        "public_site_manifest": {
                            "site_key": "tenant-a-site",
                            "site_name": "Tenant A Published",
                            "tagline": "Tenant A",
                            "nav_items": [{"label": "Trust", "href": "/trust", "module": "trust"}],
                            "enabled_public_modules": ["trust"],
                            "footer_links": [{"label": "Privacy", "href": "/privacy"}],
                            "legal_links": {"privacy": "/privacy", "terms": "/terms", "code_of_conduct": "/code-of-conduct"},
                            "trust_links": {"trust_center": "/trust", "transparency": "/transparency", "archive": "/archive"},
                            "contact": {"email": "a@example.com", "public_contact_url": "/contact", "location_label": "A"},
                        }
                    },
                ),
                NodeConfig(
                    node_id=node_b.id,
                    config_json={
                        "public_site_manifest": {
                            "site_key": "tenant-b-site",
                            "site_name": "Tenant B Published",
                            "tagline": "Tenant B",
                            "nav_items": [{"label": "Trust", "href": "/trust", "module": "trust"}],
                            "enabled_public_modules": ["trust"],
                            "footer_links": [{"label": "Privacy", "href": "/privacy"}],
                            "legal_links": {"privacy": "/privacy", "terms": "/terms", "code_of_conduct": "/code-of-conduct"},
                            "trust_links": {"trust_center": "/trust", "transparency": "/transparency", "archive": "/archive"},
                            "contact": {"email": "b@example.com", "public_contact_url": "/contact", "location_label": "B"},
                        }
                    },
                ),
            ]
        )

        db.session.commit()
        return node_a.id, node_b.id


def _get_manifest_payload(app, node_id: int, headers: dict[str, str]):
    response = app.test_client().get(
        f"/api/control/sites/{node_id}/manifest-authoring",
        headers=headers,
        base_url="http://control.test",
    )
    assert response.status_code == 200
    return response.get_json()["data"]


def test_manifest_authoring_requires_control_host():
    app = _build_app()
    node_id = _seed_node(app)
    headers = _issue_control_headers(app, "control-admin")

    response = app.test_client().patch(
        f"/api/control/sites/{node_id}/manifest-authoring",
        json={"revision_token": "psmrev:invalid", "site_name": "Updated Name"},
        headers=headers,
        base_url="http://public.test",
    )

    assert response.status_code == 403
    payload = response.get_json()
    assert payload["error"]["code"] == "control_plane_forbidden"

    publish_response = app.test_client().post(
        f"/api/control/sites/{node_id}/manifest-authoring/publish",
        json={"revision_token": "psmrev:invalid"},
        headers=headers,
        base_url="http://public.test",
    )
    assert publish_response.status_code == 403
    assert publish_response.get_json()["error"]["code"] == "control_plane_forbidden"


def test_get_manifest_authoring_returns_revision_token_and_preview_vs_published_state():
    app = _build_app()
    node_id = _seed_node(app)
    headers = _issue_control_headers(app, "control-admin")

    payload = _get_manifest_payload(app, node_id, headers)
    assert isinstance(payload.get("revision_token"), str)
    assert payload["revision_token"].startswith("psmrev:")
    assert payload["site_manifest"]["site_name"] == "Mudyin Published"
    assert payload["published_site_manifest"]["site_name"] == "Mudyin Published"
    assert payload.get("published_at") is None
    assert payload.get("published_by") is None


def test_draft_edit_does_not_mutate_published_public_shell_until_publish():
    app = _build_app()
    node_id = _seed_node(app)
    headers = _issue_control_headers(app, "control-admin")
    baseline = _get_manifest_payload(app, node_id, headers)

    draft_response = app.test_client().patch(
        f"/api/control/sites/{node_id}/manifest-authoring",
        json={
            "revision_token": baseline["revision_token"],
            "site_name": "Mudyin Draft Name",
            "tagline": "Draft tagline",
        },
        headers=headers,
        base_url="http://control.test",
    )
    assert draft_response.status_code == 200
    draft_payload = draft_response.get_json()["data"]
    assert draft_payload["site_manifest"]["site_name"] == "Mudyin Draft Name"
    assert draft_payload["published_site_manifest"]["site_name"] == "Mudyin Published"

    public_before_publish = app.test_client().get("/api/public/sites/resolve?host=mudyin.example.com")
    assert public_before_publish.status_code == 200
    assert public_before_publish.get_json()["data"]["site_manifest"]["site_name"] == "Mudyin Published"

    publish_response = app.test_client().post(
        f"/api/control/sites/{node_id}/manifest-authoring/publish",
        json={"revision_token": draft_payload["revision_token"]},
        headers=headers,
        base_url="http://control.test",
    )
    assert publish_response.status_code == 200
    publish_payload = publish_response.get_json()["data"]
    assert publish_payload["published_by"] == "control-admin"
    assert isinstance(publish_payload["published_at"], str)
    published_revision_token = publish_payload["published_revision_token"]

    public_after_publish = app.test_client().get("/api/public/sites/resolve?host=mudyin.example.com")
    assert public_after_publish.status_code == 200
    assert public_after_publish.get_json()["data"]["site_manifest"]["site_name"] == "Mudyin Draft Name"

    draft_after_publish = app.test_client().patch(
        f"/api/control/sites/{node_id}/manifest-authoring",
        json={
            "revision_token": publish_payload["revision_token"],
            "tagline": "Post publish draft change",
        },
        headers=headers,
        base_url="http://control.test",
    )
    assert draft_after_publish.status_code == 200
    draft_after_publish_payload = draft_after_publish.get_json()["data"]
    assert draft_after_publish_payload["published_revision_token"] == published_revision_token
    assert draft_after_publish_payload["published_at"] == publish_payload["published_at"]
    assert draft_after_publish_payload["published_by"] == "control-admin"
    assert draft_after_publish_payload["revision_token"] != draft_after_publish_payload["published_revision_token"]


def test_stale_publish_revision_is_rejected_with_latest_payload():
    app = _build_app()
    node_id = _seed_node(app)
    headers = _issue_control_headers(app, "control-admin")

    baseline = _get_manifest_payload(app, node_id, headers)

    fresh_draft = app.test_client().patch(
        f"/api/control/sites/{node_id}/manifest-authoring",
        json={
            "revision_token": baseline["revision_token"],
            "site_name": "Fresh Draft",
        },
        headers=headers,
        base_url="http://control.test",
    )
    assert fresh_draft.status_code == 200

    stale_publish = app.test_client().post(
        f"/api/control/sites/{node_id}/manifest-authoring/publish",
        json={"revision_token": baseline["revision_token"]},
        headers=headers,
        base_url="http://control.test",
    )
    assert stale_publish.status_code == 409
    payload = stale_publish.get_json()
    assert payload["error"]["code"] == "manifest_publish_revision_conflict"
    details = payload["error"]["details"]
    assert details["latest_revision_token"].startswith("psmrev:")
    assert details["latest_payload"]["authoring"]["site_name"] == "Fresh Draft"


def test_manifest_authoring_rejects_unknown_or_disallowed_fields():
    app = _build_app()
    node_id = _seed_node(app)
    headers = _issue_control_headers(app, "control-admin")
    latest = _get_manifest_payload(app, node_id, headers)

    response = app.test_client().patch(
        f"/api/control/sites/{node_id}/manifest-authoring",
        json={
            "revision_token": latest["revision_token"],
            "site_name": "Valid Name",
            "canonical_domains": ["evil.example.com"],
            "preview_host": "evil.preview.example.com",
            "tenant_id": 999,
        },
        headers=headers,
        base_url="http://control.test",
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"]["code"] == "validation_error"


def test_manifest_authoring_allows_about_nav_but_still_rejects_internal_routes():
    app = _build_app()
    node_id = _seed_node(app)
    headers = _issue_control_headers(app, "control-admin")
    latest = _get_manifest_payload(app, node_id, headers)

    about_response = app.test_client().patch(
        f"/api/control/sites/{node_id}/manifest-authoring",
        json={
            "revision_token": latest["revision_token"],
            "nav_items": [
                {"label": "About", "href": "/about"},
                {"label": "Trust", "href": "/trust", "module": "trust"},
            ],
        },
        headers=headers,
        base_url="http://control.test",
    )
    assert about_response.status_code == 200
    nav_hrefs = [item["href"] for item in about_response.get_json()["data"]["authoring"]["nav_items"]]
    assert "/about" in nav_hrefs

    unsafe_response = app.test_client().patch(
        f"/api/control/sites/{node_id}/manifest-authoring",
        json={
            "revision_token": about_response.get_json()["data"]["revision_token"],
            "nav_items": [{"label": "Control", "href": "/api/control/sites"}],
        },
        headers=headers,
        base_url="http://control.test",
    )
    assert unsafe_response.status_code == 400
    assert unsafe_response.get_json()["error"]["code"] == "validation_error"


def test_delegated_operator_can_read_write_publish_assigned_tenant_only():
    app = _build_app()
    allowed_node_id, _blocked_node_id = _seed_nodes_with_delegated_operator(app)
    headers = _issue_control_headers(
        app,
        "tenant-operator",
        role="node_admin",
        node_id=allowed_node_id,
        managed_node_ids=[allowed_node_id],
    )

    baseline = _get_manifest_payload(app, allowed_node_id, headers)

    draft_response = app.test_client().patch(
        f"/api/control/sites/{allowed_node_id}/manifest-authoring",
        json={"revision_token": baseline["revision_token"], "site_name": "Tenant A Draft"},
        headers=headers,
        base_url="http://control.test",
    )
    assert draft_response.status_code == 200
    draft_payload = draft_response.get_json()["data"]
    assert draft_payload["site_manifest"]["site_name"] == "Tenant A Draft"

    publish_response = app.test_client().post(
        f"/api/control/sites/{allowed_node_id}/manifest-authoring/publish",
        json={"revision_token": draft_payload["revision_token"]},
        headers=headers,
        base_url="http://control.test",
    )
    assert publish_response.status_code == 200
    publish_payload = publish_response.get_json()["data"]
    assert publish_payload["published_by"] == "tenant-operator"
    assert isinstance(publish_payload.get("published_at"), str)


def test_delegated_operator_cross_tenant_manifest_access_is_rejected_with_control_host():
    app = _build_app()
    allowed_node_id, blocked_node_id = _seed_nodes_with_delegated_operator(app)
    headers = _issue_control_headers(
        app,
        "tenant-operator",
        role="node_admin",
        node_id=allowed_node_id,
        managed_node_ids=[allowed_node_id],
    )

    get_response = app.test_client().get(
        f"/api/control/sites/{blocked_node_id}/manifest-authoring",
        headers=headers,
        base_url="http://control.test",
    )
    assert get_response.status_code == 403
    assert get_response.get_json()["error"]["code"] == "tenant_scope_forbidden"

    patch_response = app.test_client().patch(
        f"/api/control/sites/{blocked_node_id}/manifest-authoring",
        json={"revision_token": "psmrev:any", "site_name": "Blocked"},
        headers=headers,
        base_url="http://control.test",
    )
    assert patch_response.status_code == 403
    assert patch_response.get_json()["error"]["code"] == "tenant_scope_forbidden"

    publish_response = app.test_client().post(
        f"/api/control/sites/{blocked_node_id}/manifest-authoring/publish",
        json={"revision_token": "psmrev:any"},
        headers=headers,
        base_url="http://control.test",
    )
    assert publish_response.status_code == 403
    assert publish_response.get_json()["error"]["code"] == "tenant_scope_forbidden"


def test_delegated_operator_tenant_list_is_scoped_to_allowed_nodes():
    app = _build_app()
    allowed_node_id, _blocked_node_id = _seed_nodes_with_delegated_operator(app)
    headers = _issue_control_headers(
        app,
        "tenant-operator",
        role="node_admin",
        node_id=allowed_node_id,
        managed_node_ids=[allowed_node_id],
    )

    response = app.test_client().get(
        "/api/admin/tenants",
        headers=headers,
        base_url="http://control.test",
    )

    assert response.status_code == 200
    payload = response.get_json()["data"]
    assert isinstance(payload, list)
    assert len(payload) == 1
    assert payload[0]["id"] == allowed_node_id
