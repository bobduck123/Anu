"""Drift checks for the observed, partial Presence read API contract."""

import json
import os
import re
from datetime import timedelta
from pathlib import Path

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-presence-contract-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-presence-contract-1234"

from flask_jwt_extended import create_access_token  # noqa: E402

from backend_factory import load_create_app  # noqa: E402


CONTRACT_PATH = Path(__file__).resolve().parents[3] / "contracts" / "presence-current.openapi.json"


def _contract():
    return json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))


def _app():
    return load_create_app()(
        {
            "TESTING": True,
            "FLASK_ENV": "production",
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
            "RATELIMIT_ENABLED": False,
        }
    )


def _seed(app):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, PresenceCollection, PresenceNode, PresenceWork, User

    with app.app_context():
        tenant = Node(name="Contract Tenant", slug="contract-tenant", status="active")
        owner = User(
            username="contract-owner",
            pseudonym="Contract Owner",
            email="contract-owner@example.test",
            password="hash",
            role="participant",
        )
        other = User(
            username="contract-other",
            pseudonym="Other Owner",
            email="contract-other@example.test",
            password="hash",
            role="participant",
        )
        db.session.add_all([tenant, owner, other])
        db.session.flush()
        owner.node_id = tenant.id
        other.node_id = tenant.id
        public = PresenceNode(
            tenant_id=tenant.id,
            owner_user_id=owner.id,
            slug="contract-public",
            display_name="Contract Public",
            status="published",
            visibility="public",
            public_status="public",
        )
        draft = PresenceNode(
            tenant_id=tenant.id,
            owner_user_id=owner.id,
            slug="contract-draft",
            display_name="Contract Draft",
            status="draft",
            visibility="private",
            public_status="draft",
        )
        db.session.add_all([public, draft])
        db.session.flush()
        collection = PresenceCollection(node_id=public.id, title="Visible Collection", is_visible=True)
        hidden_collection = PresenceCollection(node_id=public.id, title="Hidden Collection", is_visible=False)
        db.session.add_all([collection, hidden_collection])
        db.session.flush()
        work = PresenceWork(node_id=public.id, collection_id=collection.id, title="Visible Work", is_visible=True)
        hidden_work = PresenceWork(node_id=public.id, collection_id=collection.id, title="Hidden Work", is_visible=False)
        db.session.add_all([work, hidden_work])
        db.session.commit()
        return {
            "node_id": public.id,
            "collection_id": collection.id,
            "hidden_collection_id": hidden_collection.id,
            "work_id": work.id,
            "hidden_work_id": hidden_work.id,
        }


def _owner_headers(app, username):
    with app.app_context():
        token = create_access_token(
            identity=username,
            additional_claims={
                "aud": "public",
                "token_use": "public",
                "requires_mfa": False,
                "role": "participant",
                "username": username,
            },
            expires_delta=timedelta(minutes=30),
        )
    return {"Authorization": f"Bearer {token}"}


def _is_type(value, kind):
    return {
        "object": lambda: isinstance(value, dict),
        "array": lambda: isinstance(value, list),
        "integer": lambda: type(value) is int,
        "string": lambda: isinstance(value, str),
        "boolean": lambda: type(value) is bool,
        "null": lambda: value is None,
    }[kind]()


def _assert_partial_schema(value, schema, contract, location="response"):
    """Check only the JSON Schema features used by this deliberately partial contract."""
    if "$ref" in schema:
        prefix = "#/components/schemas/"
        assert schema["$ref"].startswith(prefix)
        schema = contract["components"]["schemas"][schema["$ref"][len(prefix):]]
    if "anyOf" in schema:
        for option in schema["anyOf"]:
            try:
                _assert_partial_schema(value, option, contract, location)
                return
            except AssertionError:
                pass
        raise AssertionError(f"{location}: no anyOf alternative matched")
    kinds = schema.get("type", [])
    if isinstance(kinds, str):
        kinds = [kinds]
    if kinds:
        assert any(_is_type(value, kind) for kind in kinds), f"{location}: expected {kinds}, got {type(value).__name__}"
    if "const" in schema:
        assert value == schema["const"], f"{location}: unexpected value"
    if isinstance(value, dict):
        for key in schema.get("required", []):
            assert key in value, f"{location}: missing {key}"
        for key, child_schema in schema.get("properties", {}).items():
            if key in value:
                _assert_partial_schema(value[key], child_schema, contract, f"{location}.{key}")
    if isinstance(value, list) and "items" in schema:
        for index, item in enumerate(value):
            _assert_partial_schema(item, schema["items"], contract, f"{location}[{index}]")


def _assert_response(client, contract, path, url, *, headers=None):
    response = client.get(url, headers=headers, base_url="http://public.test")
    assert response.status_code == 200, (path, response.get_json())
    schema = contract["paths"][path]["get"]["responses"]["200"]["content"]["application/json"]["schema"]
    payload = response.get_json()
    _assert_partial_schema(payload, schema, contract, path)
    return payload["data"]


def test_documented_get_routes_are_registered_and_security_is_explicit():
    contract = _contract()
    app = _app()
    routes = {
        re.sub(r"<(?:string|int):([^>]+)>", r"{\1}", rule.rule)
        for rule in app.url_map.iter_rules()
        if "GET" in rule.methods
    }
    assert len(contract["paths"]) == 6
    operation_ids = []
    for path, path_item in contract["paths"].items():
        assert path in routes
        operation = path_item["get"]
        operation_ids.append(operation["operationId"])
        assert operation["security"] == ([] if "/public/" in path else [{"bearerAuth": []}])
        path_names = set(re.findall(r"\{([^}]+)\}", path))
        declared_names = {parameter["name"] for parameter in operation["parameters"] if parameter["in"] == "path"}
        assert path_names == declared_names
        assert "200" in operation["responses"]
        assert operation["x-implementation-status"] == "observed-subset"
    assert len(operation_ids) == len(set(operation_ids))
    assert contract["x-contract-status"] == "draft-observed"


def test_observed_read_shapes_visibility_and_owner_access():
    contract = _contract()
    app = _app()
    ids = _seed(app)
    client = app.test_client()
    public_base = "/api/presence/public/contract-public"
    owner_base = "/api/presence/owner/nodes"
    headers = _owner_headers(app, "contract-owner")

    listing = _assert_response(client, contract, "/api/presence/public/nodes", "/api/presence/public/nodes?limit=1&offset=0")
    assert listing["total"] == 1
    assert [item["slug"] for item in listing["items"]] == ["contract-public"]
    assert listing["limit"] == 1 and listing["offset"] == 0
    public = _assert_response(client, contract, "/api/presence/public/{slug}", public_base)
    assert public["slug"] == "contract-public"
    work = _assert_response(
        client, contract, "/api/presence/public/{slug}/works/{work_id}", f"{public_base}/works/{ids['work_id']}"
    )
    assert work["work"]["title"] == "Visible Work"
    collection = _assert_response(
        client, contract, "/api/presence/public/{slug}/collections/{collection_id}",
        f"{public_base}/collections/{ids['collection_id']}"
    )
    assert [item["title"] for item in collection["works"]] == ["Visible Work"]

    owner_list = _assert_response(client, contract, owner_base, owner_base, headers=headers)
    assert {node["slug"] for node in owner_list} == {"contract-public", "contract-draft"}
    owner_detail = _assert_response(
        client, contract, "/api/presence/owner/nodes/{node_id}", f"{owner_base}/{ids['node_id']}", headers=headers
    )
    assert owner_detail["id"] == ids["node_id"]
    assert "analytics" in owner_detail

    for payload in (listing["items"][0], public, work["node"], collection["node"], owner_detail):
        assert not {"owner_user_id", "tenant_id", "organisation_id"} & payload.keys()
    assert client.get("/api/presence/public/contract-draft").status_code == 404
    assert client.get(f"{public_base}/works/{ids['hidden_work_id']}").status_code == 404
    assert client.get(f"{public_base}/collections/{ids['hidden_collection_id']}").status_code == 404
    assert client.get(owner_base).status_code == 401
    other_headers = _owner_headers(app, "contract-other")
    assert client.get(owner_base, headers=other_headers).get_json()["data"] == []
    assert client.get(f"{owner_base}/{ids['node_id']}", headers=other_headers).status_code == 403
