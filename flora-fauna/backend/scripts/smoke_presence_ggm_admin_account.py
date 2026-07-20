from __future__ import annotations

import argparse
import ast
import json
import os
import sys
import time
from datetime import timedelta
from pathlib import Path
from typing import Any
from urllib import error as url_error
from urllib import request as url_request

from sqlalchemy.engine import make_url


BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parents[1]
DEFAULT_BACKEND_ENV = BACKEND_ROOT / ".env.presence-controlled-launch.backend-production.local"
DEFAULT_OUTPUT = REPO_ROOT / "docs/program/evidence/presence-ggm-admin-account-proof/account_hosted_smoke.json"

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _load_env_file(path: Path | None) -> None:
    if not path or not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, raw_value = line.removeprefix("export ").split("=", 1)
        value = raw_value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            try:
                value = ast.literal_eval(value)
            except (SyntaxError, ValueError):
                value = value[1:-1]
        os.environ[key.strip()] = str(value)


def _database_url() -> str:
    raw = next(
        (
            os.environ.get(name)
            for name in ("PRESENCE_PILOT_ADMIN_DATABASE_URL", "POSTGRES_URL", "DATABASE_URL")
            if os.environ.get(name)
        ),
        None,
    )
    if not raw:
        raise RuntimeError("Set POSTGRES_URL or PRESENCE_PILOT_ADMIN_DATABASE_URL before hosted admin smoke.")
    normalized = f"postgresql://{raw[len('postgres://') :]}" if raw.startswith("postgres://") else raw
    url = make_url(normalized).difference_update_query(["supa", "pgbouncer"])
    if not url.get_backend_name().startswith("postgresql"):
        raise RuntimeError("Hosted admin smoke requires the controlled-launch PostgreSQL target.")
    return url.render_as_string(hide_password=False)


def _build_app(database_url: str):
    os.environ["DATABASE_URL"] = database_url
    from backend_factory import load_create_app

    return load_create_app()({"SQLALCHEMY_DATABASE_URI": database_url, "AUTO_CREATE_ALL": False})


def _request_json(
    backend_url: str,
    method: str,
    route: str,
    *,
    token: str | None = None,
    body: dict[str, Any] | None = None,
    control_secret: str | None = None,
    timeout: float = 20,
) -> tuple[int, dict[str, Any], int]:
    raw_body = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"Accept": "application/json"}
    if raw_body is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if control_secret:
        headers["X-Control-Plane-Secret"] = control_secret
    request = url_request.Request(
        f"{backend_url.rstrip('/')}{route}",
        data=raw_body,
        method=method,
        headers=headers,
    )
    started = time.perf_counter()
    try:
        with url_request.urlopen(request, timeout=timeout) as response:
            status = int(response.status)
            text = response.read().decode("utf-8", errors="replace")
    except url_error.HTTPError as exc:
        status = int(exc.code)
        text = exc.read().decode("utf-8", errors="replace")
    latency_ms = int((time.perf_counter() - started) * 1000)
    try:
        payload = json.loads(text) if text else {}
    except json.JSONDecodeError:
        payload = {"non_json_response": True}
    return status, payload if isinstance(payload, dict) else {}, latency_ms


def _record(
    steps: list[dict[str, Any]],
    *,
    name: str,
    route: str,
    status: int,
    latency_ms: int,
    passed: bool,
    reason: str,
) -> None:
    steps.append(
        {
            "name": name,
            "route": route,
            "status": status,
            "latency_ms": latency_ms,
            "pass": passed,
            "reason": reason,
        }
    )


def _public_token(app, username: str, role: str) -> str:
    from flask_jwt_extended import create_access_token

    with app.app_context():
        return create_access_token(
            identity=username,
            additional_claims={
                "aud": "public",
                "token_use": "public",
                "requires_mfa": False,
                "role": role,
                "username": username,
            },
            expires_delta=timedelta(minutes=10),
        )


def _supabase_public_token(app, *, subject: str, email: str) -> str:
    from flask_jwt_extended import create_access_token

    with app.app_context():
        return create_access_token(
            identity=subject,
            additional_claims={
                "aud": "public",
                "token_use": "public",
                "requires_mfa": False,
                "role": "authenticated",
                "email": email,
                "user_metadata": {"display_name": "GGM pilot admin smoke"},
                "app_metadata": {"provider": "email"},
            },
            expires_delta=timedelta(minutes=10),
        )


def _write_result(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Hosted route smoke for the GGM pilot admin account.")
    parser.add_argument("--email", default="e4hatu@gmail.com")
    parser.add_argument("--room-slug", default="ggm-christina-goddard")
    parser.add_argument("--backend-url", default=os.environ.get("PRESENCE_PILOT_ADMIN_BACKEND_URL") or "https://anu-back-end.vercel.app")
    parser.add_argument("--backend-env-file", type=Path, default=DEFAULT_BACKEND_ENV)
    parser.add_argument("--output-json", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--timeout", type=float, default=20)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _args(argv)
    _load_env_file(args.backend_env_file)
    control_secret = os.environ.get("CONTROL_PLANE_SHARED_SECRET")
    if not control_secret:
        raise RuntimeError("CONTROL_PLANE_SHARED_SECRET must be present for hosted admin control smoke.")

    app = _build_app(_database_url())
    with app.app_context():
        from manara_backend_app.models import PresenceNode, User

        user = User.query.filter_by(email=args.email.lower()).first()
        room = PresenceNode.query.filter_by(slug=args.room_slug).first()
        if not user or not room:
            raise RuntimeError("Expected hosted GGM account and Room must exist before hosted admin smoke.")
        previous_owner_id = ((room.node_metadata or {}).get("pilot_admin_provisioning") or {}).get("original_owner_user_id")
        normal_user = User.query.get(previous_owner_id) if previous_owner_id else None
        account = {
            "user_id": user.id,
            "role": user.role,
            "global_subject_bound": bool(user.global_subject_id),
            "room_id": room.id,
            "room_slug": room.slug,
            "normal_negative_user_id": getattr(normal_user, "id", None),
        }
        if not user.global_subject_id:
            raise RuntimeError("Expected GGM pilot admin app account to be bound to Supabase subject.")
        admin_token = _supabase_public_token(
            app,
            subject=user.global_subject_id,
            email=user.email,
        )
        normal_token = _public_token(app, normal_user.username, normal_user.role) if normal_user else None

    steps: list[dict[str, Any]] = []
    health_status, _health, health_latency = _request_json(
        args.backend_url,
        "GET",
        "/healthz",
        timeout=args.timeout,
    )
    _record(
        steps,
        name="hosted_healthz",
        route="/healthz",
        status=health_status,
        latency_ms=health_latency,
        passed=health_status == 200,
        reason="production backend health endpoint",
    )

    owner_routes = [
        ("owner_studio", f"/api/presence/owner/nodes/{account['room_id']}"),
        ("owner_analytics", f"/api/presence/owner/rooms/{account['room_id']}/analytics"),
        ("owner_room_keys", f"/api/presence/owner/rooms/{account['room_id']}/keys"),
    ]
    for name, route in owner_routes:
        status, _payload, latency = _request_json(
            args.backend_url,
            "GET",
            route,
            token=admin_token,
            timeout=args.timeout,
        )
        _record(
            steps,
            name=name,
            route=route,
            status=status,
            latency_ms=latency,
            passed=status == 200,
            reason="pilot admin owner route",
        )

    public_route = f"/api/presence/public/{account['room_slug']}"
    public_status, public_payload, public_latency = _request_json(
        args.backend_url,
        "GET",
        public_route,
        timeout=args.timeout,
    )
    public_text = json.dumps(public_payload, sort_keys=True)
    public_safe = public_status == 200 and args.email.lower() not in public_text.lower() and "platform_admin" not in public_text
    _record(
        steps,
        name="public_room_admin_redaction",
        route=public_route,
        status=public_status,
        latency_ms=public_latency,
        passed=public_safe,
        reason="public Room response does not leak account email or admin role",
    )

    control_issue_status, control_issue_payload, control_issue_latency = _request_json(
        args.backend_url,
        "POST",
        "/auth/control-token",
        token=admin_token,
        body={"requires_mfa": True},
        timeout=args.timeout,
    )
    control_token = control_issue_payload.get("access_token") if isinstance(control_issue_payload, dict) else None
    _record(
        steps,
        name="control_token_issue",
        route="/auth/control-token",
        status=control_issue_status,
        latency_ms=control_issue_latency,
        passed=control_issue_status == 200 and isinstance(control_token, str) and bool(control_token),
        reason="platform admin public token can request bounded control token",
    )
    world_status, world_payload, world_latency = _request_json(
        args.backend_url,
        "GET",
        "/api/admin/presence/world-readiness",
        token=control_token if isinstance(control_token, str) else None,
        control_secret=control_secret,
        timeout=args.timeout,
    )
    world_readiness = (world_payload.get("data") or {}).get("status") if isinstance(world_payload, dict) else None
    _record(
        steps,
        name="control_world_readiness",
        route="/api/admin/presence/world-readiness",
        status=world_status,
        latency_ms=world_latency,
        passed=world_status == 200 and world_readiness in {"hidden", "forming"},
        reason="admin protected endpoint accepts account control token and World stays hidden/forming",
    )

    if normal_token:
        negative_route = f"/api/presence/owner/rooms/{account['room_id']}/analytics"
        negative_status, _negative, negative_latency = _request_json(
            args.backend_url,
            "GET",
            negative_route,
            token=normal_token,
            timeout=args.timeout,
        )
        _record(
            steps,
            name="old_fixture_owner_analytics_denied",
            route=negative_route,
            status=negative_status,
            latency_ms=negative_latency,
            passed=negative_status == 403,
            reason="previous fixture owner is not the GGM owner after provisioning",
        )
    else:
        _record(
            steps,
            name="old_fixture_owner_analytics_denied",
            route=f"/api/presence/owner/rooms/{account['room_id']}/analytics",
            status=0,
            latency_ms=0,
            passed=False,
            reason="previous owner fixture unavailable for negative route proof",
        )

    result = {
        "backend_url": args.backend_url,
        "account": account,
        "summary": {
            "pass": sum(1 for step in steps if step["pass"]),
            "fail": sum(1 for step in steps if not step["pass"]),
        },
        "steps": steps,
        "entitlement_api": "no hosted account/plan API found; verified by DB/service script",
        "login_posture": "short-lived subject-shaped hosted JWT route smoke; interactive account sign-in not performed",
        "tokens_printed": False,
        "secret_values_printed": False,
    }
    _write_result(args.output_json, result)
    print(json.dumps({"output_json": str(args.output_json), **result}, indent=2, sort_keys=True))
    return 0 if result["summary"]["fail"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
