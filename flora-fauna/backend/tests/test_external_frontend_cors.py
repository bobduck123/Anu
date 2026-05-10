import os

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-external-cors-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-external-cors-1234"

from backend_factory import load_create_app  # noqa: E402
import pytest  # noqa: E402


APPROVED_ORIGINS = [
    "https://mudyin.com",
    "https://www.mudyin.com",
    "https://mudyin-live.vercel.app",
]
UNAPPROVED_ORIGIN = "https://unknown.example"


def _build_app():
    create_app = load_create_app()
    return create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
            "CORS_ORIGINS": APPROVED_ORIGINS,
        }
    )


@pytest.mark.parametrize("origin", APPROVED_ORIGINS)
def test_approved_external_origin_can_preflight_public_config_with_tenant_hint_header(origin):
    app = _build_app()

    response = app.test_client().options(
        "/api/public/nodes/current/config",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "X-ANU-Site-Slug",
        },
    )

    assert response.status_code == 200
    assert response.headers.get("Access-Control-Allow-Origin") == origin
    assert "X-ANU-Site-Slug" in response.headers.get("Access-Control-Allow-Headers", "")


def test_unapproved_external_origin_does_not_receive_cors_grant():
    app = _build_app()

    response = app.test_client().options(
        "/api/public/nodes/current/config",
        headers={
            "Origin": UNAPPROVED_ORIGIN,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "X-ANU-Site-Slug",
        },
    )

    assert response.status_code == 200
    assert response.headers.get("Access-Control-Allow-Origin") is None


@pytest.mark.parametrize("origin", APPROVED_ORIGINS)
def test_approved_external_origin_can_read_registry_only_public_config(origin):
    app = _build_app()

    response = app.test_client().get(
        "/api/public/nodes/current/config",
        headers={"Origin": origin, "X-ANU-Site-Slug": "mudyin"},
    )

    assert response.status_code == 200
    assert response.headers.get("Access-Control-Allow-Origin") == origin
    assert response.get_json()["node_slug"] == "mudyin"
