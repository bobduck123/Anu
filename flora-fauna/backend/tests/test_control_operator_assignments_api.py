import os
from datetime import timedelta

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-operator-assignments-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-operator-assignments-1234"

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


def _manifest_stub(site_name: str, site_key: str):
    return {
        "site_key": site_key,
        "site_name": site_name,
        "tagline": site_name,
        "nav_items": [{"label": "Trust", "href": "/trust", "module": "trust"}],
        "enabled_public_modules": ["trust"],
        "footer_links": [{"label": "Privacy", "href": "/privacy"}],
        "legal_links": {"privacy": "/privacy", "terms": "/terms", "code_of_conduct": "/code-of-conduct"},
        "trust_links": {"trust_center": "/trust", "transparency": "/transparency", "archive": "/archive"},
        "contact": {"email": "operator@example.com", "public_contact_url": "/contact", "location_label": "Sydney"},
    }


def _seed_fixture(app):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, NodeConfig, User

    with app.app_context():
        node_a = Node(name="Tenant A", slug="tenant-a", status="active")
        node_b = Node(name="Tenant B", slug="tenant-b", status="active")
        db.session.add_all([node_a, node_b])
        db.session.flush()

        platform_admin = User(
            username="platform-admin",
            pseudonym="Platform Admin",
            email="platform-admin@example.com",
            password="hash",
            role="platform_admin",
        )
        delegated_operator = User(
            username="tenant-operator",
            pseudonym="Tenant Operator",
            email="tenant-operator@example.com",
            password="hash",
            role="node_admin",
            node_id=node_a.id,
        )
        second_operator = User(
            username="second-operator",
            pseudonym="Second Operator",
            email="second-operator@example.com",
            password="hash",
            role="node_admin",
            node_id=node_a.id,
        )
        db.session.add_all([platform_admin, delegated_operator, second_operator])
        db.session.flush()

        db.session.add_all(
            [
                NodeConfig(
                    node_id=node_a.id,
                    config_json={
                        "public_site_manifest": _manifest_stub("Tenant A", "tenant-a-site"),
                        "control_operator_assignments": {
                            "usernames": ["tenant-operator"],
                            "user_ids": [delegated_operator.id],
                        },
                    },
                ),
                NodeConfig(
                    node_id=node_b.id,
                    config_json={
                        "public_site_manifest": _manifest_stub("Tenant B", "tenant-b-site"),
                    },
                ),
            ]
        )
        db.session.commit()

        return {
            "tenant_a": node_a.id,
            "tenant_b": node_b.id,
            "delegated_operator_id": delegated_operator.id,
            "second_operator_id": second_operator.id,
        }


def _issue_control_headers(
    app,
    username: str,
    role: str = "platform_admin",
    *,
    scopes: list[str] | None = None,
    node_id: int | None = None,
    managed_node_ids: list[int] | None = None,
):
    if scopes is None:
        scopes = [
            "sites:operator-assignments:read",
            "sites:operator-assignments:write",
            "sites:manifest:read",
            "sites:manifest:write",
        ]
    with app.app_context():
        claims = {
            "aud": "control",
            "token_use": "control",
            "requires_mfa": True,
            "role": role,
            "scp": scopes,
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


def _issue_public_headers(app, username: str, role: str = "node_admin") -> dict[str, str]:
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


def _mint_control_token(app, username: str, role: str = "node_admin"):
    response = app.test_client().post(
        "/auth/control-token",
        json={"requires_mfa": True},
        headers=_issue_public_headers(app, username=username, role=role),
    )
    assert response.status_code == 200
    token = response.get_json()["access_token"]
    with app.app_context():
        claims = decode_token(token)
    return token, claims


def _control_headers(token: str):
    return {"Authorization": f"Bearer {token}"}


def test_platform_admin_can_read_assignments():
    app = _build_app()
    ids = _seed_fixture(app)
    headers = _issue_control_headers(app, "platform-admin")

    response = app.test_client().get(
        f"/api/control/sites/{ids['tenant_a']}/operator-assignments",
        headers=headers,
        base_url="http://control.test",
    )
    assert response.status_code == 200
    payload = response.get_json()["data"]
    assert payload["node_id"] == ids["tenant_a"]
    assert payload["assignments"]["usernames"] == ["tenant-operator"]
    assert payload["assignments"]["user_ids"] == [ids["delegated_operator_id"]]
    assert payload["assignments"]["count"] == 1


def test_platform_admin_can_assign_operator_and_duplicate_assignment_is_idempotent():
    app = _build_app()
    ids = _seed_fixture(app)
    headers = _issue_control_headers(app, "platform-admin")

    first = app.test_client().post(
        f"/api/control/sites/{ids['tenant_b']}/operator-assignments",
        json={"username": "  SECOND-OPERATOR  "},
        headers=headers,
        base_url="http://control.test",
    )
    assert first.status_code == 200
    first_payload = first.get_json()["data"]
    assert first_payload["mutation"]["normalized_username"] == "second-operator"
    assert first_payload["mutation"]["applied"] is True
    assert first_payload["mutation"]["idempotent_noop"] is False

    second = app.test_client().post(
        f"/api/control/sites/{ids['tenant_b']}/operator-assignments",
        json={"username": "Second-Operator"},
        headers=headers,
        base_url="http://control.test",
    )
    assert second.status_code == 200
    second_payload = second.get_json()["data"]
    assert second_payload["mutation"]["normalized_username"] == "second-operator"
    assert second_payload["mutation"]["applied"] is False
    assert second_payload["mutation"]["idempotent_noop"] is True
    assert second_payload["assignments"]["usernames"] == ["second-operator"]
    assert second_payload["assignments"]["user_ids"] == [ids["second_operator_id"]]

    with app.app_context():
        from manara_backend_app.models import ControlAuditEvent

        events = (
            ControlAuditEvent.query.filter_by(action="control_operator_assignment_assigned")
            .order_by(ControlAuditEvent.id.asc())
            .all()
        )
        assert len(events) == 2
        assert events[-1].payload.get("normalized_username") == "second-operator"
        assert "access_token" not in (events[-1].payload or {})


def test_platform_admin_can_unassign_operator_and_unassign_behavior_is_stable():
    app = _build_app()
    ids = _seed_fixture(app)
    headers = _issue_control_headers(app, "platform-admin")

    first = app.test_client().delete(
        f"/api/control/sites/{ids['tenant_a']}/operator-assignments/TENANT-OPERATOR",
        headers=headers,
        base_url="http://control.test",
    )
    assert first.status_code == 200
    first_payload = first.get_json()["data"]
    assert first_payload["mutation"]["normalized_username"] == "tenant-operator"
    assert first_payload["mutation"]["applied"] is True
    assert first_payload["mutation"]["idempotent_noop"] is False

    second = app.test_client().delete(
        f"/api/control/sites/{ids['tenant_a']}/operator-assignments/tenant-operator",
        headers=headers,
        base_url="http://control.test",
    )
    assert second.status_code == 200
    second_payload = second.get_json()["data"]
    assert second_payload["mutation"]["normalized_username"] == "tenant-operator"
    assert second_payload["mutation"]["applied"] is False
    assert second_payload["mutation"]["idempotent_noop"] is True
    assert second_payload["assignments"]["usernames"] == []
    assert second_payload["assignments"]["user_ids"] == []


def test_non_platform_operator_cannot_mutate_assignments():
    app = _build_app()
    ids = _seed_fixture(app)
    headers = _issue_control_headers(
        app,
        "tenant-operator",
        role="node_admin",
        node_id=ids["tenant_a"],
        managed_node_ids=[ids["tenant_a"]],
    )

    assign_response = app.test_client().post(
        f"/api/control/sites/{ids['tenant_b']}/operator-assignments",
        json={"username": "second-operator"},
        headers=headers,
        base_url="http://control.test",
    )
    assert assign_response.status_code == 403
    assert assign_response.get_json()["error"]["code"] == "platform_admin_required"

    unassign_response = app.test_client().delete(
        f"/api/control/sites/{ids['tenant_a']}/operator-assignments/tenant-operator",
        headers=headers,
        base_url="http://control.test",
    )
    assert unassign_response.status_code == 403
    assert unassign_response.get_json()["error"]["code"] == "platform_admin_required"


def test_token_issuance_reflects_updated_persisted_assignments():
    app = _build_app()
    ids = _seed_fixture(app)
    platform_headers = _issue_control_headers(app, "platform-admin")

    _baseline_token, baseline_claims = _mint_control_token(app, "tenant-operator", role="node_admin")
    assert baseline_claims.get("node_id") == ids["tenant_a"]
    assert baseline_claims.get("managed_node_ids") in (None, [])

    assign_response = app.test_client().post(
        f"/api/control/sites/{ids['tenant_b']}/operator-assignments",
        json={"username": "TENANT-OPERATOR"},
        headers=platform_headers,
        base_url="http://control.test",
    )
    assert assign_response.status_code == 200
    assert assign_response.get_json()["data"]["mutation"]["normalized_username"] == "tenant-operator"

    _updated_token, updated_claims = _mint_control_token(app, "tenant-operator", role="node_admin")
    assert updated_claims.get("node_id") == ids["tenant_a"]
    assert sorted(int(value) for value in (updated_claims.get("managed_node_ids") or [])) == sorted(
        [ids["tenant_a"], ids["tenant_b"]]
    )


def test_runtime_manifest_and_admin_tenant_scope_remain_consistent_after_assignment_changes():
    app = _build_app()
    ids = _seed_fixture(app)
    platform_headers = _issue_control_headers(app, "platform-admin")

    baseline_token, _baseline_claims = _mint_control_token(app, "tenant-operator", role="node_admin")
    baseline_manifest_denied = app.test_client().get(
        f"/api/control/sites/{ids['tenant_b']}/manifest-authoring",
        headers=_control_headers(baseline_token),
        base_url="http://control.test",
    )
    assert baseline_manifest_denied.status_code == 403
    assert baseline_manifest_denied.get_json()["error"]["code"] == "tenant_scope_forbidden"

    baseline_tenant_list = app.test_client().get(
        "/api/admin/tenants",
        headers=_control_headers(baseline_token),
        base_url="http://control.test",
    )
    assert baseline_tenant_list.status_code == 200
    assert [row["id"] for row in baseline_tenant_list.get_json()["data"]] == [ids["tenant_a"]]

    assign_response = app.test_client().post(
        f"/api/control/sites/{ids['tenant_b']}/operator-assignments",
        json={"username": "tenant-operator"},
        headers=platform_headers,
        base_url="http://control.test",
    )
    assert assign_response.status_code == 200

    granted_token, _granted_claims = _mint_control_token(app, "tenant-operator", role="node_admin")
    granted_manifest = app.test_client().get(
        f"/api/control/sites/{ids['tenant_b']}/manifest-authoring",
        headers=_control_headers(granted_token),
        base_url="http://control.test",
    )
    assert granted_manifest.status_code == 200

    granted_tenant_list = app.test_client().get(
        "/api/admin/tenants",
        headers=_control_headers(granted_token),
        base_url="http://control.test",
    )
    assert granted_tenant_list.status_code == 200
    assert sorted(row["id"] for row in granted_tenant_list.get_json()["data"]) == sorted(
        [ids["tenant_a"], ids["tenant_b"]]
    )

    unassign_response = app.test_client().delete(
        f"/api/control/sites/{ids['tenant_b']}/operator-assignments/TENANT-OPERATOR",
        headers=platform_headers,
        base_url="http://control.test",
    )
    assert unassign_response.status_code == 200

    # Existing token remains constrained by persisted assignment intersection.
    stale_manifest_denied = app.test_client().get(
        f"/api/control/sites/{ids['tenant_b']}/manifest-authoring",
        headers=_control_headers(granted_token),
        base_url="http://control.test",
    )
    assert stale_manifest_denied.status_code == 403
    assert stale_manifest_denied.get_json()["error"]["code"] == "tenant_scope_forbidden"

    reduced_token, reduced_claims = _mint_control_token(app, "tenant-operator", role="node_admin")
    assert reduced_claims.get("managed_node_ids") in (None, [])
    assert reduced_claims.get("node_id") == ids["tenant_a"]

    reduced_tenant_list = app.test_client().get(
        "/api/admin/tenants",
        headers=_control_headers(reduced_token),
        base_url="http://control.test",
    )
    assert reduced_tenant_list.status_code == 200
    assert [row["id"] for row in reduced_tenant_list.get_json()["data"]] == [ids["tenant_a"]]
