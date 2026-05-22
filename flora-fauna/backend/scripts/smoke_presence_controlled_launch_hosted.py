from __future__ import annotations

import argparse
import json
import os
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


SAFE_SNIPPET_LIMIT = 420
DEFAULT_TIMEOUT_SECONDS = 20


@dataclass
class StepResult:
    step: str
    status: str
    route: str
    reason: str
    latency_ms: int | None = None
    status_code: int | None = None
    shape_matched: bool | None = None
    detail: dict[str, Any] = field(default_factory=dict)


@dataclass
class Response:
    status: int | None
    payload: Any
    headers: dict[str, str]
    latency_ms: int
    error: str | None = None


class HostedClient:
    def __init__(
        self,
        base_url: str,
        *,
        frontend_origin: str,
        timeout_seconds: int,
        bypass_token: str | None,
        bypass_header_name: str,
        set_bypass_cookie: bool,
    ):
        self.base_url = base_url.rstrip("/")
        self.frontend_origin = frontend_origin.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.bypass_token = bypass_token
        self.bypass_header_name = bypass_header_name
        self.set_bypass_cookie = set_bypass_cookie

    def request(
        self,
        method: str,
        path: str,
        *,
        token: str | None = None,
        control_secret: str | None = None,
        json_body: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> Response:
        request_headers = {"Accept": "application/json", **(headers or {})}
        if token:
            request_headers["Authorization"] = f"Bearer {token}"
        if control_secret:
            request_headers["X-Control-Plane-Secret"] = control_secret
        if self.bypass_token:
            request_headers[self.bypass_header_name] = self.bypass_token
            if self.set_bypass_cookie:
                request_headers["x-vercel-set-bypass-cookie"] = "true"
        data = None
        if json_body is not None:
            request_headers["Content-Type"] = "application/json"
            data = json.dumps(json_body).encode("utf-8")
        request = Request(
            f"{self.base_url}{path}",
            data=data,
            headers=request_headers,
            method=method.upper(),
        )
        started = time.perf_counter()
        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                raw = response.read().decode("utf-8", errors="replace")
                return Response(
                    status=response.status,
                    payload=_decode_payload(raw),
                    headers=_headers(response.headers.items()),
                    latency_ms=_latency(started),
                )
        except HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")
            return Response(
                status=exc.code,
                payload=_decode_payload(raw),
                headers=_headers(exc.headers.items()),
                latency_ms=_latency(started),
            )
        except (TimeoutError, URLError, OSError) as exc:
            return Response(
                status=None,
                payload={},
                headers={},
                latency_ms=_latency(started),
                error=type(exc).__name__,
            )


def _latency(started: float) -> int:
    return round((time.perf_counter() - started) * 1000)


def _headers(items: Any) -> dict[str, str]:
    return {str(key).lower(): str(value) for key, value in items}


def _decode_payload(raw: str) -> Any:
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"non_json_excerpt": raw[:SAFE_SNIPPET_LIMIT]}


def _data(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return {}
    data = payload.get("data")
    return data if isinstance(data, dict) else {}


def _items(payload: dict[str, Any]) -> list[dict[str, Any]]:
    items = payload.get("items")
    if not isinstance(items, list):
        return []
    return [item for item in items if isinstance(item, dict)]


def _env(name: str) -> str | None:
    value = os.environ.get(name)
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _int_env(name: str) -> int | None:
    raw = _env(name)
    if not raw:
        return None
    try:
        return int(raw)
    except ValueError:
        return None


def _is_ok_envelope(response: Response) -> bool:
    return isinstance(response.payload, dict) and response.payload.get("ok") is True and isinstance(response.payload.get("data"), dict)


def _has_trace_leak(payload: Any) -> bool:
    text = json.dumps(payload, ensure_ascii=True).lower() if not isinstance(payload, str) else payload.lower()
    return any(marker in text for marker in ("traceback", "stack trace", "werkzeug", "sqlalchemy.exc", 'file "'))


def _public_hall_id(hall: dict[str, Any]) -> int | None:
    hall_id = hall.get("id")
    return hall_id if isinstance(hall_id, int) else None


def _ids_from_hall(hall: dict[str, Any], key: str) -> list[int]:
    ids: list[int] = []
    for item in hall.get(key) or []:
        if isinstance(item, dict) and isinstance(item.get("id"), int):
            ids.append(item["id"])
    return ids


class SmokeRun:
    def __init__(self, args: argparse.Namespace):
        self.args = args
        self.client = HostedClient(
            args.base_url,
            frontend_origin=args.frontend_origin,
            timeout_seconds=args.timeout,
            bypass_token=args.bypass_token,
            bypass_header_name=args.bypass_header_name,
            set_bypass_cookie=args.set_bypass_cookie,
        )
        self.steps: list[StepResult] = []
        self.state: dict[str, Any] = {}

    def pass_step(
        self,
        step: str,
        route: str,
        reason: str,
        response: Response | None = None,
        *,
        shape: bool | None = None,
        detail: dict[str, Any] | None = None,
    ) -> None:
        self.steps.append(
            StepResult(
                step=step,
                status="pass",
                route=route,
                reason=reason,
                latency_ms=response.latency_ms if response else None,
                status_code=response.status if response else None,
                shape_matched=shape,
                detail=detail or {},
            )
        )

    def fail_step(
        self,
        step: str,
        route: str,
        reason: str,
        response: Response | None = None,
        *,
        shape: bool | None = False,
        detail: dict[str, Any] | None = None,
    ) -> None:
        safe_detail = detail or {}
        if response and response.error:
            safe_detail = {**safe_detail, "transport_error": response.error}
        self.steps.append(
            StepResult(
                step=step,
                status="fail",
                route=route,
                reason=reason,
                latency_ms=response.latency_ms if response else None,
                status_code=response.status if response else None,
                shape_matched=shape,
                detail=safe_detail,
            )
        )

    def blocked_step(self, step: str, route: str, reason: str, *, missing_env: list[str] | None = None) -> None:
        detail = {"missing_env": missing_env} if missing_env else {}
        self.steps.append(StepResult(step=step, status="blocked", route=route, reason=reason, detail=detail))

    def request_check(
        self,
        step: str,
        route: str,
        method: str,
        path: str,
        expected: set[int],
        shape_check: Callable[[Response], bool],
        *,
        token: str | None = None,
        control_secret: str | None = None,
        json_body: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        pass_reason: str,
        fail_reason: str,
    ) -> Response:
        response = self.client.request(
            method,
            path,
            token=token,
            control_secret=control_secret,
            json_body=json_body,
            headers=headers,
        )
        shape = shape_check(response)
        if response.status in expected and shape and not _has_trace_leak(response.payload):
            self.pass_step(step, route, pass_reason, response, shape=shape)
        else:
            self.fail_step(step, route, fail_reason, response, shape=shape)
        return response

    def run(self) -> dict[str, Any]:
        self.health_and_cors()
        self.public_contract()
        self.observer_contract()
        self.hall_path_contract()
        self.owner_contract()
        self.admin_contract()
        summary: dict[str, int] = {}
        for result in self.steps:
            summary[result.status] = summary.get(result.status, 0) + 1
        return {
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
            "backend_url": self.args.base_url,
            "frontend_origin": self.args.frontend_origin,
            "dry_run": self.args.dry_run,
            "mutating_fixture_steps_enabled": not self.args.dry_run,
            "bypass_header_configured": bool(self.args.bypass_token),
            "steps": [asdict(step) for step in self.steps],
            "summary": summary,
            "result": "fail" if summary.get("fail") else "blocked" if summary.get("blocked") else "pass",
            "secret_values_printed": False,
        }

    def health_and_cors(self) -> None:
        self.request_check(
            "healthz",
            "/healthz",
            "GET",
            "/healthz",
            {200},
            lambda response: isinstance(response.payload, dict) and response.payload.get("status") == "ok",
            pass_reason="Liveness endpoint returned the minimal ok payload.",
            fail_reason="Liveness endpoint did not return status=ok.",
        )
        self.request_check(
            "health",
            "/health",
            "GET",
            "/health",
            {200},
            lambda response: isinstance(response.payload, dict)
            and response.payload.get("status") == "ok"
            and response.payload.get("ready") is True,
            pass_reason="Health endpoint reports configured, ready dependencies.",
            fail_reason="Health endpoint did not report a ready configured backend.",
        )
        preflight_paths = [
            ("cors_halls", "/api/halls"),
            ("cors_garden_home", "/api/garden/home"),
            ("cors_observer_garden", "/api/observer/garden"),
            ("cors_observations", "/api/observations"),
            ("cors_owner_halls", "/api/presence/owner/halls"),
            ("cors_path_from_hall", f"/api/paths/from-hall/{self.args.hall_id or 1}"),
            ("cors_room_key", "/api/presence/keys/<room-key-token>/resolve"),
            ("cors_public_room", "/api/presence/public/<room-slug>"),
        ]
        for step, route in preflight_paths:
            path = route.replace("<room-key-token>", "launch-smoke-room-key").replace("<room-slug>", "launch-smoke-room")
            response = self.client.request(
                "OPTIONS",
                path,
                headers={
                    "Origin": self.args.frontend_origin,
                    "Access-Control-Request-Method": "GET",
                    "Access-Control-Request-Headers": "authorization,content-type",
                },
            )
            allow_origin = response.headers.get("access-control-allow-origin")
            wildcard_with_credentials = allow_origin == "*" and response.headers.get("access-control-allow-credentials") == "true"
            shape = allow_origin == self.args.frontend_origin and not wildcard_with_credentials
            if response.status in {200, 204} and shape:
                self.pass_step(step, route, "Approved frontend CORS preflight returned the expected allow-origin.", response, shape=True)
            else:
                self.fail_step(step, route, "Approved frontend CORS preflight was missing or unsafe.", response, shape=shape)
        denied = self.client.request(
            "OPTIONS",
            "/api/halls",
            headers={
                "Origin": self.args.disallowed_origin,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization,content-type",
            },
        )
        denied_origin = denied.headers.get("access-control-allow-origin")
        denied_shape = denied_origin not in {"*", self.args.disallowed_origin}
        if denied.status in {200, 204} and denied_shape:
            self.pass_step("cors_disallowed_origin", "/api/halls", "Unapproved CORS origin was not reflected.", denied, shape=True)
        else:
            self.fail_step("cors_disallowed_origin", "/api/halls", "Unapproved CORS origin was allowed or preflight leaked wildcard CORS.", denied, shape=denied_shape)
        missing = self.client.request("GET", "/__presence_controlled_launch_missing__")
        missing_shape = missing.status == 404 and not _has_trace_leak(missing.payload)
        if missing_shape:
            self.pass_step("safe_404", "/__presence_controlled_launch_missing__", "Unknown route returned a safe 404 response.", missing, shape=True)
        else:
            self.fail_step("safe_404", "/__presence_controlled_launch_missing__", "Unknown route did not return a safe 404 response.", missing, shape=missing_shape)
        invalid = self.client.request("GET", "/api/garden/home", token="invalid-controlled-launch-token")
        invalid_shape = invalid.status in {401, 403} and not _has_trace_leak(invalid.payload)
        if invalid_shape:
            self.pass_step("invalid_auth", "/api/garden/home", "Invalid bearer auth failed safely.", invalid, shape=True)
        else:
            self.fail_step("invalid_auth", "/api/garden/home", "Invalid bearer auth did not fail with safe 401/403 behavior.", invalid, shape=invalid_shape)

    def public_contract(self) -> None:
        halls = self.request_check(
            "public_halls",
            "/api/halls",
            "GET",
            "/api/halls",
            {200},
            lambda response: _is_ok_envelope(response) and isinstance(_data(response.payload).get("items"), list),
            pass_reason="Public Hall list returned the canonical envelope.",
            fail_reason="Public Hall list did not return the canonical envelope.",
        )
        if _is_ok_envelope(halls):
            items = _items(_data(halls.payload))
            if items and not self.args.hall_slug:
                slug = items[0].get("slug")
                if isinstance(slug, str):
                    self.state["hall_slug"] = slug
                hall_id = _public_hall_id(items[0])
                if hall_id:
                    self.state["hall_id"] = hall_id
        hall_slug = self.args.hall_slug or self.state.get("hall_slug")
        if hall_slug:
            hall = self.request_check(
                "public_hall_detail",
                "/api/halls/<hall-slug>",
                "GET",
                f"/api/halls/{hall_slug}",
                {200},
                lambda response: _is_ok_envelope(response)
                and isinstance(_data(response.payload).get("id"), int)
                and isinstance(_data(response.payload).get("slug"), str),
                pass_reason="Public Hall detail returned Hall identifiers and shape.",
                fail_reason="Public Hall detail did not return the Hall contract.",
            )
            if _is_ok_envelope(hall):
                data = _data(hall.payload)
                self.state["hall_slug"] = hall_slug
                self.state["hall_id"] = self.args.hall_id or _public_hall_id(data)
                self.state["portal_id"] = self.args.portal_id or next(iter(_ids_from_hall(data, "portals")), None)
                self.state["stall_id"] = self.args.stall_id or next(iter(_ids_from_hall(data, "stalls")), None)
        else:
            self.blocked_step("public_hall_detail", "/api/halls/<hall-slug>", "No public Hall slug was provided or discoverable.", missing_env=["PRESENCE_HOSTED_HALL_SLUG"])
        if self.args.mask_alias:
            self.request_check(
                "public_mask",
                "/api/masks/<alias>",
                "GET",
                f"/api/masks/{self.args.mask_alias}",
                {200},
                lambda response: _is_ok_envelope(response) and isinstance(_data(response.payload).get("observer"), dict),
                pass_reason="Public Mask alias returned a Mask/Garden payload.",
                fail_reason="Public Mask alias did not return the expected safe payload.",
            )
            self.request_check(
                "public_garden",
                "/api/gardens/<alias>",
                "GET",
                f"/api/gardens/{self.args.mask_alias}",
                {200},
                lambda response: _is_ok_envelope(response)
                and isinstance(_data(response.payload).get("id"), int)
                and isinstance(_data(response.payload).get("observer_mask"), dict),
                pass_reason="Public Garden alias returned a Garden payload.",
                fail_reason="Public Garden alias did not return the expected Garden payload.",
            )
        else:
            self.blocked_step("public_mask", "/api/masks/<alias>", "Set a public smoke Mask alias.", missing_env=["PRESENCE_HOSTED_MASK_ALIAS"])
            self.blocked_step("public_garden", "/api/gardens/<alias>", "Set a public smoke Garden alias.", missing_env=["PRESENCE_HOSTED_MASK_ALIAS"])
        if self.args.public_room_slug:
            self.request_check(
                "public_room",
                "/api/presence/public/<room-slug>",
                "GET",
                f"/api/presence/public/{self.args.public_room_slug}",
                {200},
                lambda response: _is_ok_envelope(response) and isinstance(_data(response.payload).get("slug"), str),
                pass_reason="Public Presence Room API returned the room payload.",
                fail_reason="Public Presence Room API did not return the room payload.",
            )
        else:
            self.blocked_step("public_room", "/api/presence/public/<room-slug>", "Set a hosted public Room slug fixture.", missing_env=["PRESENCE_HOSTED_PUBLIC_ROOM_SLUG"])
        if self.args.room_key_token:
            if self.args.dry_run:
                self.blocked_step("room_key_resolve", "/api/presence/keys/<room-key-token>/resolve", "Dry-run skips RoomKey resolve because it captures an encounter.")
            else:
                self.request_check(
                    "room_key_resolve",
                    "/api/presence/keys/<room-key-token>/resolve",
                    "GET",
                    f"/api/presence/keys/{self.args.room_key_token}/resolve",
                    {200},
                    lambda response: _is_ok_envelope(response)
                    and isinstance(_data(response.payload).get("room"), dict)
                    and isinstance(_data(response.payload).get("encounter"), dict),
                    pass_reason="Hosted RoomKey resolved and captured one fixture encounter.",
                    fail_reason="Hosted RoomKey resolve did not return the public entry contract.",
                )
        else:
            self.blocked_step("room_key_resolve", "/api/presence/keys/<room-key-token>/resolve", "Set a safe hosted RoomKey token fixture.", missing_env=["PRESENCE_HOSTED_ROOM_KEY_TOKEN"])
        self.request_check(
            "world_admin_not_public",
            "/api/admin/presence/world-readiness",
            "GET",
            "/api/admin/presence/world-readiness",
            {401, 403, 404},
            lambda response: not _has_trace_leak(response.payload),
            pass_reason="World readiness/admin data is not public.",
            fail_reason="World readiness/admin data was public or leaked an unsafe response.",
        )

    def observer_contract(self) -> None:
        token = self.args.observer_token
        if not token:
            for step, route in [
                ("observer_garden_home", "/api/garden/home"),
                ("observer_observation", "/api/observations"),
                ("observer_echo", "/api/observations/<observation-id>/echoes"),
                ("observer_self_promotion_guard", "/api/observations"),
                ("observer_list_seeds", "/api/garden/seeds"),
                ("observer_nurture_seed", "/api/garden/seeds/<seed-id>/nurture"),
                ("observer_prune_seed", "/api/garden/seeds/<seed-id>/prune"),
                ("observer_mood_board_seed", "/api/observer/mood-boards/<board-id>/items/<item-id>/seed"),
                ("observer_join_hall", "/api/halls/<hall-slug>/join"),
                ("observer_leave_hall", "/api/halls/<hall-slug>/leave"),
                ("observer_hall_observation", "/api/halls/<hall-slug>/observations"),
            ]:
                self.blocked_step(step, route, "Set the hosted observer fixture token.", missing_env=["PRESENCE_HOSTED_OBSERVER_TOKEN"])
            return
        self.request_check(
            "observer_garden_home",
            "/api/garden/home",
            "GET",
            "/api/garden/home",
            {200},
            lambda response: _is_ok_envelope(response) and isinstance(_data(response.payload).get("sections"), list),
            token=token,
            pass_reason="Observer Garden home returned canonical sections.",
            fail_reason="Observer Garden home did not return the canonical contract.",
        )
        seeds = self.request_check(
            "observer_list_seeds",
            "/api/garden/seeds",
            "GET",
            "/api/garden/seeds",
            {200},
            lambda response: _is_ok_envelope(response) and isinstance(_data(response.payload).get("items"), list),
            token=token,
            pass_reason="Observer Seed list returned the canonical envelope.",
            fail_reason="Observer Seed list did not return the canonical envelope.",
        )
        if _is_ok_envelope(seeds) and not self.args.seed_id:
            seed_ids = [item.get("id") for item in _items(_data(seeds.payload)) if isinstance(item.get("id"), int)]
            if seed_ids:
                self.state["seed_id"] = seed_ids[0]
        if self.args.dry_run:
            for step, route in [
                ("observer_observation", "/api/observations"),
                ("observer_echo", "/api/observations/<observation-id>/echoes"),
                ("observer_self_promotion_guard", "/api/observations"),
                ("observer_nurture_seed", "/api/garden/seeds/<seed-id>/nurture"),
                ("observer_prune_seed", "/api/garden/seeds/<seed-id>/prune"),
                ("observer_mood_board_seed", "/api/observer/mood-boards/<board-id>/items/<item-id>/seed"),
                ("observer_join_hall", "/api/halls/<hall-slug>/join"),
                ("observer_leave_hall", "/api/halls/<hall-slug>/leave"),
                ("observer_hall_observation", "/api/halls/<hall-slug>/observations"),
            ]:
                self.blocked_step(step, route, "Dry-run skips fixture mutation.")
            return
        observation = self.request_check(
            "observer_observation",
            "/api/observations",
            "POST",
            "/api/observations",
            {201},
            lambda response: _is_ok_envelope(response) and isinstance(_data(response.payload).get("id"), int),
            token=token,
            json_body={
                "observation_kind": "text",
                "body": "launch_smoke fixture Observation.",
                "visibility": "mask_only",
            },
            pass_reason="Observer fixture created a tagged Observation.",
            fail_reason="Observer fixture could not create a tagged Observation.",
        )
        observation_id = _data(observation.payload).get("id") if _is_ok_envelope(observation) else None
        if isinstance(observation_id, int):
            self.request_check(
                "observer_echo",
                "/api/observations/<observation-id>/echoes",
                "POST",
                f"/api/observations/{observation_id}/echoes",
                {201},
                lambda response: _is_ok_envelope(response)
                and isinstance(_data(response.payload).get("id"), int)
                and isinstance(_data(response.payload).get("commentary"), str),
                token=token,
                json_body={"commentary": "launch_smoke fixture Echo commentary."},
                pass_reason="Observer fixture created an Echo with commentary.",
                fail_reason="Observer fixture Echo did not match the commentary contract.",
            )
        else:
            self.blocked_step("observer_echo", "/api/observations/<observation-id>/echoes", "Observation create did not yield an id.")
        self.request_check(
            "observer_self_promotion_guard",
            "/api/observations",
            "POST",
            "/api/observations",
            {400, 422},
            lambda response: not _has_trace_leak(response.payload),
            token=token,
            json_body={"body": "Book my launch_smoke services at https://example.com", "visibility": "public"},
            pass_reason="Self-promotion Observation was rejected safely.",
            fail_reason="Self-promotion Observation was not rejected safely.",
        )
        seed_id = self.args.seed_id or self.state.get("seed_id")
        if isinstance(seed_id, int):
            self.request_check(
                "observer_nurture_seed",
                "/api/garden/seeds/<seed-id>/nurture",
                "POST",
                f"/api/garden/seeds/{seed_id}/nurture",
                {200, 201},
                lambda response: _is_ok_envelope(response),
                token=token,
                json_body={},
                pass_reason="Fixture Seed nurture action succeeded.",
                fail_reason="Fixture Seed nurture action failed.",
            )
            self.request_check(
                "observer_prune_seed",
                "/api/garden/seeds/<seed-id>/prune",
                "POST",
                f"/api/garden/seeds/{seed_id}/prune",
                {200, 201},
                lambda response: _is_ok_envelope(response),
                token=token,
                json_body={"reason": "launch_smoke"},
                pass_reason="Fixture Seed prune action succeeded.",
                fail_reason="Fixture Seed prune action failed.",
            )
        else:
            self.blocked_step("observer_nurture_seed", "/api/garden/seeds/<seed-id>/nurture", "Set a safe Seed fixture id.", missing_env=["PRESENCE_HOSTED_SEED_ID"])
            self.blocked_step("observer_prune_seed", "/api/garden/seeds/<seed-id>/prune", "Set a safe Seed fixture id.", missing_env=["PRESENCE_HOSTED_SEED_ID"])
        if self.args.mood_board_id and self.args.mood_board_item_id:
            self.request_check(
                "observer_mood_board_seed",
                "/api/observer/mood-boards/<board-id>/items/<item-id>/seed",
                "POST",
                f"/api/observer/mood-boards/{self.args.mood_board_id}/items/{self.args.mood_board_item_id}/seed",
                {201},
                lambda response: _is_ok_envelope(response) and isinstance(_data(response.payload).get("seed"), dict),
                token=token,
                json_body={},
                pass_reason="Mood Board fixture item planted into Garden.",
                fail_reason="Mood Board fixture item did not plant into Garden.",
            )
        else:
            self.blocked_step(
                "observer_mood_board_seed",
                "/api/observer/mood-boards/<board-id>/items/<item-id>/seed",
                "Set hosted Mood Board fixture ids.",
                missing_env=["PRESENCE_HOSTED_MOOD_BOARD_ID", "PRESENCE_HOSTED_MOOD_BOARD_ITEM_ID"],
            )
        hall_slug = self.args.hall_slug or self.state.get("hall_slug")
        if not hall_slug:
            for step, route in [
                ("observer_join_hall", "/api/halls/<hall-slug>/join"),
                ("observer_leave_hall", "/api/halls/<hall-slug>/leave"),
                ("observer_hall_observation", "/api/halls/<hall-slug>/observations"),
            ]:
                self.blocked_step(step, route, "Set a safe public Hall slug fixture.", missing_env=["PRESENCE_HOSTED_HALL_SLUG"])
            return
        self.request_check(
            "observer_join_hall",
            "/api/halls/<hall-slug>/join",
            "POST",
            f"/api/halls/{hall_slug}/join",
            {200, 201},
            lambda response: _is_ok_envelope(response) and _data(response.payload).get("joined") is True,
            token=token,
            json_body={},
            pass_reason="Observer fixture joined the Hall.",
            fail_reason="Observer fixture Hall join failed.",
        )
        self.request_check(
            "observer_hall_observation",
            "/api/halls/<hall-slug>/observations",
            "POST",
            f"/api/halls/{hall_slug}/observations",
            {201},
            lambda response: _is_ok_envelope(response) and isinstance(_data(response.payload).get("id"), int),
            token=token,
            json_body={"body": "launch_smoke fixture Hall Observation.", "visibility": "hall"},
            pass_reason="Observer fixture created a Hall Observation.",
            fail_reason="Observer fixture Hall Observation failed.",
        )
        self.request_check(
            "observer_leave_hall",
            "/api/halls/<hall-slug>/leave",
            "POST",
            f"/api/halls/{hall_slug}/leave",
            {200, 201},
            lambda response: _is_ok_envelope(response),
            token=token,
            json_body={},
            pass_reason="Observer fixture left or marked away from the Hall.",
            fail_reason="Observer fixture Hall leave failed.",
        )

    def hall_path_contract(self) -> None:
        hall_id = self.args.hall_id or self.state.get("hall_id")
        hall_slug = self.args.hall_slug or self.state.get("hall_slug")
        if hall_slug and (self.args.portal_id or self.state.get("portal_id")):
            portal_id = self.args.portal_id or self.state.get("portal_id")
            if self.args.dry_run:
                self.blocked_step("hall_portal_click", "/api/halls/<hall-slug>/portals/<portal-id>/click", "Dry-run skips Hall activity event mutation.")
            else:
                self.request_check(
                    "hall_portal_click",
                    "/api/halls/<hall-slug>/portals/<portal-id>/click",
                    "POST",
                    f"/api/halls/{hall_slug}/portals/{portal_id}/click",
                    {201},
                    lambda response: _is_ok_envelope(response) and isinstance(_data(response.payload).get("event"), dict),
                    json_body={"source": "launch_smoke"},
                    pass_reason="Hall portal click recorded an activity event.",
                    fail_reason="Hall portal click did not record an activity event.",
                )
        else:
            self.blocked_step("hall_portal_click", "/api/halls/<hall-slug>/portals/<portal-id>/click", "Set or expose a safe Hall portal fixture.", missing_env=["PRESENCE_HOSTED_HALL_PORTAL_ID"])
        if hall_slug and (self.args.stall_id or self.state.get("stall_id")):
            stall_id = self.args.stall_id or self.state.get("stall_id")
            if self.args.dry_run:
                self.blocked_step("hall_stall_visit", "/api/halls/<hall-slug>/stalls/<stall-id>/visit", "Dry-run skips Hall activity event mutation.")
            else:
                self.request_check(
                    "hall_stall_visit",
                    "/api/halls/<hall-slug>/stalls/<stall-id>/visit",
                    "POST",
                    f"/api/halls/{hall_slug}/stalls/{stall_id}/visit",
                    {201},
                    lambda response: _is_ok_envelope(response) and isinstance(_data(response.payload).get("event"), dict),
                    json_body={"source": "launch_smoke"},
                    pass_reason="Hall stall visit recorded an activity event.",
                    fail_reason="Hall stall visit did not record an activity event.",
                )
        else:
            self.blocked_step("hall_stall_visit", "/api/halls/<hall-slug>/stalls/<stall-id>/visit", "Set or expose a safe Hall stall fixture.", missing_env=["PRESENCE_HOSTED_HALL_STALL_ID"])
        if isinstance(hall_id, int):
            self.request_check(
                "path_from_hall",
                "/api/paths/from-hall/<hall-id>",
                "GET",
                f"/api/paths/from-hall/{hall_id}",
                {200},
                lambda response: _is_ok_envelope(response) and _data(response.payload).get("trailhead_type") == "hall",
                pass_reason="Path from Hall returned the Hall trailhead path.",
                fail_reason="Path from Hall did not return a Hall path contract.",
            )
            if self.args.dry_run:
                self.blocked_step("generate_path_from_hall", "/api/paths/generate/from-hall/<hall-id>", "Dry-run skips Path generation mutation.")
            else:
                self.request_check(
                    "generate_path_from_hall",
                    "/api/paths/generate/from-hall/<hall-id>",
                    "POST",
                    f"/api/paths/generate/from-hall/{hall_id}",
                    {201},
                    lambda response: _is_ok_envelope(response) and _data(response.payload).get("trailhead_type") == "hall",
                    json_body={},
                    pass_reason="Fixture generated a Path from Hall.",
                    fail_reason="Path generation from Hall failed.",
                )
        else:
            self.blocked_step("path_from_hall", "/api/paths/from-hall/<hall-id>", "Set or discover a safe Hall id fixture.", missing_env=["PRESENCE_HOSTED_HALL_ID"])
            self.blocked_step("generate_path_from_hall", "/api/paths/generate/from-hall/<hall-id>", "Set or discover a safe Hall id fixture.", missing_env=["PRESENCE_HOSTED_HALL_ID"])

    def owner_contract(self) -> None:
        token = self.args.owner_token
        room_id = self.args.owner_room_id
        if not token or not room_id:
            for step, route in [
                ("owner_halls", "/api/presence/owner/halls?room_id=<owner-room-id>"),
                ("owner_hall_detail", "/api/presence/owner/halls/<owner-hall-id>?room_id=<owner-room-id>"),
                ("owner_hall_analytics", "/api/presence/owner/halls/<owner-hall-id>/analytics?room_id=<owner-room-id>"),
                ("owner_draft_hall_create", "/api/presence/owner/halls"),
                ("owner_draft_hall_archive", "/api/presence/owner/halls/<hall-id>"),
                ("owner_cross_owner_denial", "/api/presence/owner/halls/<foreign-hall-id>?room_id=<foreign-room-id>"),
                ("hall_activity_metrics", "/api/presence/owner/halls/<owner-hall-id>/analytics?room_id=<owner-room-id>"),
            ]:
                self.blocked_step(step, route, "Set hosted owner fixture token and Room id.", missing_env=["PRESENCE_HOSTED_OWNER_TOKEN", "PRESENCE_HOSTED_OWNER_ROOM_ID"])
            return
        owner_halls = self.request_check(
            "owner_halls",
            "/api/presence/owner/halls?room_id=<owner-room-id>",
            "GET",
            f"/api/presence/owner/halls?{urlencode({'room_id': room_id})}",
            {200},
            lambda response: _is_ok_envelope(response) and isinstance(_data(response.payload).get("items"), list),
            token=token,
            pass_reason="Owner Hall list returned owner-scoped envelope.",
            fail_reason="Owner Hall list did not return owner-scoped envelope.",
        )
        owner_hall_id = self.args.owner_hall_id
        if not owner_hall_id and _is_ok_envelope(owner_halls):
            owner_items = _items(_data(owner_halls.payload))
            if owner_items and isinstance(owner_items[0].get("id"), int):
                owner_hall_id = owner_items[0]["id"]
        if owner_hall_id:
            owner_query = urlencode({"room_id": room_id})
            self.request_check(
                "owner_hall_detail",
                "/api/presence/owner/halls/<owner-hall-id>?room_id=<owner-room-id>",
                "GET",
                f"/api/presence/owner/halls/{owner_hall_id}?{owner_query}",
                {200},
                lambda response: _is_ok_envelope(response) and isinstance(_data(response.payload).get("id"), int),
                token=token,
                pass_reason="Owner Hall detail returned owner-scoped Hall.",
                fail_reason="Owner Hall detail failed owner-scoped contract.",
            )
            self.request_check(
                "owner_hall_analytics",
                "/api/presence/owner/halls/<owner-hall-id>/analytics?room_id=<owner-room-id>",
                "GET",
                f"/api/presence/owner/halls/{owner_hall_id}/analytics?{owner_query}",
                {200},
                lambda response: _is_ok_envelope(response)
                and all(key in _data(response.payload) for key in ("portal_clicks", "stall_visits", "people_gathered")),
                token=token,
                pass_reason="Owner Hall analytics returned canonical metrics.",
                fail_reason="Owner Hall analytics did not return canonical metrics.",
            )
            self.request_check(
                "hall_activity_metrics",
                "/api/presence/owner/halls/<owner-hall-id>/analytics?room_id=<owner-room-id>",
                "GET",
                f"/api/presence/owner/halls/{owner_hall_id}/analytics?{owner_query}",
                {200},
                lambda response: _is_ok_envelope(response)
                and all(isinstance(_data(response.payload).get(key), int) for key in ("portal_clicks", "stall_visits")),
                token=token,
                pass_reason="Owner analytics exposes Hall activity metrics for event verification.",
                fail_reason="Owner analytics did not expose Hall activity metrics.",
            )
        else:
            for step, route in [
                ("owner_hall_detail", "/api/presence/owner/halls/<owner-hall-id>?room_id=<owner-room-id>"),
                ("owner_hall_analytics", "/api/presence/owner/halls/<owner-hall-id>/analytics?room_id=<owner-room-id>"),
                ("hall_activity_metrics", "/api/presence/owner/halls/<owner-hall-id>/analytics?room_id=<owner-room-id>"),
            ]:
                self.blocked_step(step, route, "Set or expose a safe owner Hall fixture id.", missing_env=["PRESENCE_HOSTED_OWNER_HALL_ID"])
        if self.args.dry_run or not self.args.allow_owner_draft_hall:
            reason = "Dry-run skips owner Hall mutation." if self.args.dry_run else "Pass --allow-owner-draft-hall only for a safe hosted owner fixture."
            self.blocked_step("owner_draft_hall_create", "/api/presence/owner/halls", reason)
            self.blocked_step("owner_draft_hall_archive", "/api/presence/owner/halls/<hall-id>", reason)
        else:
            created = self.request_check(
                "owner_draft_hall_create",
                "/api/presence/owner/halls",
                "POST",
                "/api/presence/owner/halls",
                {201},
                lambda response: _is_ok_envelope(response) and isinstance(_data(response.payload).get("id"), int),
                token=token,
                json_body={
                    "host_room_id": room_id,
                    "title": f"launch_smoke draft Hall {int(time.time())}",
                    "slug": f"launch-smoke-hall-{int(time.time())}",
                    "hall_type": "studio_hall",
                    "visibility": "private",
                    "status": "draft",
                    "rules_text": "launch_smoke fixture - archive after proof",
                },
                pass_reason="Safe owner fixture created tagged draft Hall.",
                fail_reason="Tagged draft Hall create failed.",
            )
            created_id = _data(created.payload).get("id") if _is_ok_envelope(created) else None
            if isinstance(created_id, int):
                self.request_check(
                    "owner_draft_hall_archive",
                    "/api/presence/owner/halls/<hall-id>",
                    "DELETE",
                    f"/api/presence/owner/halls/{created_id}?{urlencode({'room_id': room_id})}",
                    {200},
                    lambda response: _is_ok_envelope(response) and _data(response.payload).get("deleted") is True,
                    token=token,
                    pass_reason="Tagged draft Hall was archived through owner API cleanup.",
                    fail_reason="Tagged draft Hall cleanup did not archive the Hall.",
                )
            else:
                self.blocked_step("owner_draft_hall_archive", "/api/presence/owner/halls/<hall-id>", "Draft Hall create did not yield an id.")
        if self.args.foreign_hall_id and self.args.foreign_room_id:
            self.request_check(
                "owner_cross_owner_denial",
                "/api/presence/owner/halls/<foreign-hall-id>?room_id=<foreign-room-id>",
                "GET",
                f"/api/presence/owner/halls/{self.args.foreign_hall_id}?{urlencode({'room_id': self.args.foreign_room_id})}",
                {403, 404},
                lambda response: not _has_trace_leak(response.payload),
                token=token,
                pass_reason="Owner token could not read another owner Hall scope.",
                fail_reason="Owner cross-owner Hall denial failed.",
            )
        else:
            self.blocked_step(
                "owner_cross_owner_denial",
                "/api/presence/owner/halls/<foreign-hall-id>?room_id=<foreign-room-id>",
                "Set foreign fixture ids to prove owner isolation.",
                missing_env=["PRESENCE_HOSTED_FOREIGN_HALL_ID", "PRESENCE_HOSTED_FOREIGN_ROOM_ID"],
            )

    def admin_contract(self) -> None:
        self.request_check(
            "admin_halls_without_auth",
            "/api/admin/presence/halls",
            "GET",
            "/api/admin/presence/halls",
            {401, 403, 404},
            lambda response: not _has_trace_leak(response.payload),
            pass_reason="Admin Hall internals reject unauthenticated requests.",
            fail_reason="Admin Hall internals did not reject unauthenticated requests safely.",
        )
        if self.args.admin_token:
            self.request_check(
                "admin_world_with_auth",
                "/api/admin/presence/world-readiness",
                "GET",
                "/api/admin/presence/world-readiness",
                {200},
                lambda response: _is_ok_envelope(response),
                token=self.args.admin_token,
                control_secret=self.args.control_secret,
                pass_reason="Admin/control fixture can read World readiness internals.",
                fail_reason="Admin/control fixture could not read World readiness internals.",
            )
        else:
            self.blocked_step("admin_world_with_auth", "/api/admin/presence/world-readiness", "Set admin/control fixture auth if admin positive proof is required.", missing_env=["PRESENCE_HOSTED_ADMIN_TOKEN"])


def _markdown(result: dict[str, Any]) -> str:
    rows = [
        "# Presence Controlled Launch Hosted Smoke",
        "",
        f"- Generated: `{result['generated_at']}`",
        f"- Backend: `{result['backend_url']}`",
        f"- Frontend origin: `{result['frontend_origin']}`",
        f"- Result: **{result['result'].upper()}**",
        f"- Dry run: `{str(result['dry_run']).lower()}`",
        "",
        "| Step | Result | Route | HTTP | Latency | Shape | Reason |",
        "|---|---|---|---:|---:|---|---|",
    ]
    for step in result["steps"]:
        rows.append(
            f"| `{step['step']}` | {step['status']} | `{step['route']}` | {step['status_code'] or ''} | "
            f"{step['latency_ms'] or ''} | {step['shape_matched'] if step['shape_matched'] is not None else ''} | {step['reason']} |"
        )
    rows.extend(["", f"Summary: `{json.dumps(result['summary'], sort_keys=True)}`", ""])
    return "\n".join(rows)


def _write(path: Path | None, content: str) -> None:
    if not path:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Smoke Presence controlled-launch hosted backend contracts without printing secrets.")
    parser.add_argument("--base-url", default=_env("PRESENCE_HOSTED_BACKEND_URL"), help="Hosted backend API origin.")
    parser.add_argument(
        "--frontend-origin",
        default=_env("PRESENCE_HOSTED_FRONTEND_ORIGIN") or _env("PRESENCE_HOSTED_FRONTEND_URL"),
        help="Deployed frontend origin for CORS preflights.",
    )
    parser.add_argument("--disallowed-origin", default="https://presence-controlled-launch.invalid")
    parser.add_argument("--timeout", type=int, default=int(_env("PRESENCE_HOSTED_TIMEOUT") or DEFAULT_TIMEOUT_SECONDS))
    parser.add_argument("--dry-run", action="store_true", help="Run read-only and negative-auth probes, blocking fixture mutations.")
    parser.add_argument("--json-out", type=Path)
    parser.add_argument("--markdown-out", type=Path)
    parser.add_argument("--bypass-token", default=_env("PRESENCE_HOSTED_BYPASS_TOKEN"), help="Protection bypass token; prefer env.")
    parser.add_argument("--bypass-header-name", default=_env("PRESENCE_HOSTED_BYPASS_HEADER_NAME") or "x-vercel-protection-bypass")
    parser.add_argument("--set-bypass-cookie", action="store_true", default=_env("PRESENCE_HOSTED_SET_BYPASS_COOKIE") == "true")
    parser.add_argument("--observer-token", default=_env("PRESENCE_HOSTED_OBSERVER_TOKEN"), help="Observer fixture bearer token; prefer env.")
    parser.add_argument("--owner-token", default=_env("PRESENCE_HOSTED_OWNER_TOKEN"), help="Owner fixture bearer token; prefer env.")
    parser.add_argument("--admin-token", default=_env("PRESENCE_HOSTED_ADMIN_TOKEN"), help="Admin/control fixture bearer token; prefer env.")
    parser.add_argument("--control-secret", default=_env("PRESENCE_HOSTED_CONTROL_SECRET"), help="Control-plane shared secret; prefer env.")
    parser.add_argument("--hall-id", type=int, default=_int_env("PRESENCE_HOSTED_HALL_ID"))
    parser.add_argument("--hall-slug", default=_env("PRESENCE_HOSTED_HALL_SLUG"))
    parser.add_argument("--portal-id", type=int, default=_int_env("PRESENCE_HOSTED_HALL_PORTAL_ID"))
    parser.add_argument("--stall-id", type=int, default=_int_env("PRESENCE_HOSTED_HALL_STALL_ID"))
    parser.add_argument("--mask-alias", default=_env("PRESENCE_HOSTED_MASK_ALIAS"))
    parser.add_argument("--public-room-slug", default=_env("PRESENCE_HOSTED_PUBLIC_ROOM_SLUG"))
    parser.add_argument(
        "--room-key-token",
        default=_env("PRESENCE_HOSTED_ROOM_KEY_TOKEN") or _env("PRESENCE_HOSTED_ROOMKEY_TOKEN"),
    )
    parser.add_argument("--seed-id", type=int, default=_int_env("PRESENCE_HOSTED_SEED_ID"))
    parser.add_argument("--mood-board-id", type=int, default=_int_env("PRESENCE_HOSTED_MOOD_BOARD_ID"))
    parser.add_argument("--mood-board-item-id", type=int, default=_int_env("PRESENCE_HOSTED_MOOD_BOARD_ITEM_ID"))
    parser.add_argument("--owner-room-id", type=int, default=_int_env("PRESENCE_HOSTED_OWNER_ROOM_ID"))
    parser.add_argument("--owner-hall-id", type=int, default=_int_env("PRESENCE_HOSTED_OWNER_HALL_ID"))
    parser.add_argument("--foreign-hall-id", type=int, default=_int_env("PRESENCE_HOSTED_FOREIGN_HALL_ID"))
    parser.add_argument("--foreign-room-id", type=int, default=_int_env("PRESENCE_HOSTED_FOREIGN_ROOM_ID"))
    parser.add_argument("--allow-owner-draft-hall", action="store_true", help="Create and archive one tagged draft Hall with safe owner fixtures.")
    args = parser.parse_args(argv)
    if not args.base_url or not args.frontend_origin:
        parser.error("Set --base-url and --frontend-origin or PRESENCE_HOSTED_BACKEND_URL and PRESENCE_HOSTED_FRONTEND_ORIGIN.")
    return args


def main(argv: list[str] | None = None) -> int:
    args = _args(argv)
    result = SmokeRun(args).run()
    rendered_json = json.dumps(result, indent=2, sort_keys=True)
    _write(args.json_out, rendered_json + "\n")
    _write(args.markdown_out, _markdown(result))
    print(rendered_json)
    if result["result"] == "fail":
        return 1
    if result["result"] == "blocked":
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
