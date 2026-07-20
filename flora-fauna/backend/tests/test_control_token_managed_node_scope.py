import os
from datetime import datetime, timedelta, timezone

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-control-token-scope-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-control-token-scope-1234"

from flask_jwt_extended import create_access_token, decode_token  # noqa: E402

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


def _seed_scope_fixture(app):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, NodeConfig, User

    with app.app_context():
        node_a = Node(name="Tenant A", slug="tenant-a", status="active")
        node_b = Node(name="Tenant B", slug="tenant-b", status="active")
        node_c = Node(name="Tenant C", slug="tenant-c", status="active")
        db.session.add_all([node_a, node_b, node_c])
        db.session.flush()

        platform_admin = User(
            username="platform-admin",
            pseudonym="Platform Admin",
            email="platform-admin@example.com",
            password="hash",
            role="platform_admin",
        )
        single_operator = User(
            username="single-operator",
            pseudonym="Single Operator",
            email="single-operator@example.com",
            password="hash",
            role="node_admin",
            node_id=node_a.id,
        )
        multi_operator = User(
            username="multi-operator",
            pseudonym="Multi Operator",
            email="multi-operator@example.com",
            password="hash",
            role="node_admin",
            node_id=node_a.id,
        )
        db.session.add_all([platform_admin, single_operator, multi_operator])
        db.session.flush()

        db.session.add_all(
            [
                NodeConfig(
                    node_id=node_a.id,
                    config_json={
                        "public_site_manifest": {
                            "site_key": "tenant-a-site",
                            "site_name": "Tenant A",
                            "tagline": "A",
                            "nav_items": [{"label": "Trust", "href": "/trust", "module": "trust"}],
                            "enabled_public_modules": ["trust"],
                            "footer_links": [{"label": "Privacy", "href": "/privacy"}],
                            "legal_links": {"privacy": "/privacy", "terms": "/terms", "code_of_conduct": "/code-of-conduct"},
                            "trust_links": {"trust_center": "/trust", "transparency": "/transparency", "archive": "/archive"},
                            "contact": {"email": "a@example.com", "public_contact_url": "/contact", "location_label": "A"},
                        },
                        "control_operator_assignments": {
                            "usernames": ["single-operator", "multi-operator"],
                            "user_ids": [single_operator.id, multi_operator.id],
                        },
                    },
                ),
                NodeConfig(
                    node_id=node_b.id,
                    config_json={
                        "public_site_manifest": {
                            "site_key": "tenant-b-site",
                            "site_name": "Tenant B",
                            "tagline": "B",
                            "nav_items": [{"label": "Trust", "href": "/trust", "module": "trust"}],
                            "enabled_public_modules": ["trust"],
                            "footer_links": [{"label": "Privacy", "href": "/privacy"}],
                            "legal_links": {"privacy": "/privacy", "terms": "/terms", "code_of_conduct": "/code-of-conduct"},
                            "trust_links": {"trust_center": "/trust", "transparency": "/transparency", "archive": "/archive"},
                            "contact": {"email": "b@example.com", "public_contact_url": "/contact", "location_label": "B"},
                        },
                        "control_operator_assignments": {
                            "usernames": ["multi-operator"],
                            "user_ids": [multi_operator.id],
                        },
                    },
                ),
                NodeConfig(
                    node_id=node_c.id,
                    config_json={
                        "public_site_manifest": {
                            "site_key": "tenant-c-site",
                            "site_name": "Tenant C",
                            "tagline": "C",
                            "nav_items": [{"label": "Trust", "href": "/trust", "module": "trust"}],
                            "enabled_public_modules": ["trust"],
                            "footer_links": [{"label": "Privacy", "href": "/privacy"}],
                            "legal_links": {"privacy": "/privacy", "terms": "/terms", "code_of_conduct": "/code-of-conduct"},
                            "trust_links": {"trust_center": "/trust", "transparency": "/transparency", "archive": "/archive"},
                            "contact": {"email": "c@example.com", "public_contact_url": "/contact", "location_label": "C"},
                        }
                    },
                ),
            ]
        )
        db.session.commit()

        return {
            "tenant_a": node_a.id,
            "tenant_b": node_b.id,
            "tenant_c": node_c.id,
        }


def _issue_public_auth_headers(app, username: str, role: str = "node_admin") -> dict[str, str]:
    with app.app_context():
        token = create_access_token(
            identity=username,
            additional_claims={
                "aud": "public",
                "token_use": "public",
                "requires_mfa": False,
                "role": role,
            },
            expires_delta=timedelta(minutes=30),
        )
    return {"Authorization": f"Bearer {token}"}


def _mint_control_token(app, username: str, role: str = "node_admin", payload: dict | None = None):
    headers = _issue_public_auth_headers(app, username=username, role=role)
    body = {"requires_mfa": True}
    if payload:
        body.update(payload)

    response = app.test_client().post(
        "/auth/control-token",
        json=body,
        headers=headers,
    )
    assert response.status_code == 200
    token = response.get_json()["access_token"]
    with app.app_context():
        claims = decode_token(token)
    return token, claims


def _control_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_single_tenant_operator_gets_exactly_one_authorized_tenant_claim_and_scope():
    app = _build_app()
    ids = _seed_scope_fixture(app)

    token, claims = _mint_control_token(app, "single-operator", role="node_admin")

    assert claims.get("node_id") == ids["tenant_a"]
    assert claims.get("managed_node_ids") in (None, [])

    tenants_response = app.test_client().get(
        "/api/admin/tenants",
        headers=_control_headers(token),
        base_url="http://control.test",
    )
    assert tenants_response.status_code == 200
    tenant_ids = sorted(row["id"] for row in tenants_response.get_json()["data"])
    assert tenant_ids == [ids["tenant_a"]]


def test_multi_tenant_operator_gets_exact_assigned_managed_node_ids_and_scope():
    app = _build_app()
    ids = _seed_scope_fixture(app)

    token, claims = _mint_control_token(app, "multi-operator", role="node_admin")

    managed = sorted(int(value) for value in (claims.get("managed_node_ids") or []))
    assert managed == sorted([ids["tenant_a"], ids["tenant_b"]])

    tenants_response = app.test_client().get(
        "/api/admin/tenants",
        headers=_control_headers(token),
        base_url="http://control.test",
    )
    assert tenants_response.status_code == 200
    tenant_ids = sorted(row["id"] for row in tenants_response.get_json()["data"])
    assert tenant_ids == sorted([ids["tenant_a"], ids["tenant_b"]])


def test_unassigned_tenant_manifest_access_remains_forbidden_for_delegated_operator():
    app = _build_app()
    ids = _seed_scope_fixture(app)

    token, _claims = _mint_control_token(app, "multi-operator", role="node_admin")

    forbidden_response = app.test_client().get(
        f"/api/control/sites/{ids['tenant_c']}/manifest-authoring",
        headers=_control_headers(token),
        base_url="http://control.test",
    )
    assert forbidden_response.status_code == 403
    assert forbidden_response.get_json()["error"]["code"] == "tenant_scope_forbidden"


def test_platform_admin_scope_behavior_remains_all_tenants_visible():
    app = _build_app()
    ids = _seed_scope_fixture(app)

    token, claims = _mint_control_token(app, "platform-admin", role="platform_admin")

    assert claims.get("role") == "platform_admin"

    tenants_response = app.test_client().get(
        "/api/admin/tenants",
        headers=_control_headers(token),
        base_url="http://control.test",
    )
    assert tenants_response.status_code == 200
    tenant_ids = sorted(row["id"] for row in tenants_response.get_json()["data"])
    assert ids["tenant_a"] in tenant_ids
    assert ids["tenant_b"] in tenant_ids
    assert ids["tenant_c"] in tenant_ids


def test_forged_or_absent_managed_node_ids_do_not_widen_access_beyond_persisted_assignments():
    app = _build_app()
    ids = _seed_scope_fixture(app)

    issued_token, issued_claims = _mint_control_token(
        app,
        "single-operator",
        role="node_admin",
        payload={"managed_node_ids": [ids["tenant_c"]]},
    )

    assert issued_claims.get("node_id") == ids["tenant_a"]
    assert ids["tenant_c"] not in [int(v) for v in (issued_claims.get("managed_node_ids") or [])]

    with app.app_context():
        forged_token = create_access_token(
            identity="control::single-operator",
            additional_claims={
                "aud": "control",
                "token_use": "control",
                "requires_mfa": True,
                "role": "node_admin",
                "scp": ["sites:manifest:read", "sites:manifest:write"],
                "node_id": ids["tenant_c"],
                "managed_node_ids": [ids["tenant_c"]],
            },
            expires_delta=timedelta(minutes=30),
        )

    denied = app.test_client().get(
        f"/api/control/sites/{ids['tenant_c']}/manifest-authoring",
        headers=_control_headers(forged_token),
        base_url="http://control.test",
    )
    assert denied.status_code == 403
    assert denied.get_json()["error"]["code"] == "tenant_scope_forbidden"

    # Issued token with absent managed_node_ids still follows persisted assignment (tenant A only).
    issued_allowed = app.test_client().get(
        f"/api/control/sites/{ids['tenant_a']}/manifest-authoring",
        headers=_control_headers(issued_token),
        base_url="http://control.test",
    )
    assert issued_allowed.status_code == 200

    absent_managed_denied = app.test_client().get(
        f"/api/control/sites/{ids['tenant_c']}/manifest-authoring",
        headers=_control_headers(issued_token),
        base_url="http://control.test",
    )
    assert absent_managed_denied.status_code == 403


def test_control_token_grant_accepts_aware_hosted_expiry():
    app = _build_app()
    _seed_scope_fixture(app)

    from manara_backend_app.extensions import db
    from manara_backend_app.models import ControlTokenGrant, User
    from manara_backend_app.security.control_plane import _is_control_token_grant_active

    with app.app_context():
        admin = User.query.filter_by(username="platform-admin").one()
        grant = ControlTokenGrant(
            jti="aware-hosted-expiry-grant",
            user_id=admin.id,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )
        db.session.add(grant)
        db.session.flush()

        assert _is_control_token_grant_active({"jti": grant.jti}, admin.id) is True
