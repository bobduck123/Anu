import os
from unittest.mock import patch

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-public-transparency-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-public-transparency-1234"

from backend_factory import load_create_app  # noqa: E402


def _build_client():
    create_app = load_create_app()
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
        }
    )
    return app.test_client()


def test_public_transparency_node_summary_returns_json_when_metrics_degrade():
    client = _build_client()

    with patch(
        "manara_backend_app.api.public.resolve_node",
        side_effect=RuntimeError("transparency metrics unavailable"),
    ):
        response = client.get("/public/transparency/node-summary")

    assert response.status_code == 200
    payload = response.get_json()["data"]
    assert payload["status"] == "degraded"
    assert payload["data_mode"] == "fallback"
    assert payload["reason"] == "transparency_data_unavailable"
    assert payload["node"]["slug"] == "au-nsw-sydney"
    assert payload["pools"] == []
    assert payload["receipts"] == []


def test_public_transparency_node_summary_preserves_not_found_for_unknown_node():
    client = _build_client()

    with patch("manara_backend_app.api.public.resolve_node", return_value=None):
        response = client.get("/public/transparency/node-summary?node=missing-node")

    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "not_found"
