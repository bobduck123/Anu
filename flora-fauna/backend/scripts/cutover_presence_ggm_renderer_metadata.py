from __future__ import annotations

import argparse
import ast
import json
import os
import sys
from pathlib import Path
from typing import Any

from sqlalchemy.engine import make_url


BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parents[1]
DEFAULT_BACKEND_ENV = BACKEND_ROOT / ".env.presence-controlled-launch.backend-production.local"
DEFAULT_RESULT = REPO_ROOT / "docs/program/evidence/presence-ggm-hosted-cutover-proof/renderer_metadata_result.json"
GGM_RENDERER_KEY = "ggm-faithful-room-v1"
GGM_ROOM_SLUG = "ggm-christina-goddard"
CREATED_BY = "cutover_presence_ggm_renderer_metadata"

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


def _database_url(environment: str) -> str:
    names = (
        ("PRESENCE_PILOT_GGM_DATABASE_URL", "POSTGRES_URL", "DATABASE_URL")
        if environment == "hosted_controlled_launch"
        else ("PRESENCE_PILOT_GGM_DATABASE_URL", "DATABASE_URL")
    )
    raw = next((os.environ.get(name) for name in names if os.environ.get(name)), None)
    if not raw:
        raise RuntimeError(f"Set one of {', '.join(names)} before GGM renderer metadata cutover.")
    normalized = f"postgresql://{raw[len('postgres://') :]}" if raw.startswith("postgres://") else raw
    url = make_url(normalized).difference_update_query(["supa", "pgbouncer"])
    if environment == "hosted_controlled_launch" and not url.get_backend_name().startswith("postgresql"):
        raise RuntimeError("Hosted GGM renderer metadata cutover requires PostgreSQL.")
    return url.render_as_string(hide_password=False)


def _build_app(database_url: str):
    os.environ["DATABASE_URL"] = database_url
    from backend_factory import load_create_app

    return load_create_app()({"SQLALCHEMY_DATABASE_URI": database_url, "AUTO_CREATE_ALL": False})


def _renderer_metadata(existing: dict[str, Any] | None, environment: str) -> dict[str, Any]:
    metadata = dict(existing or {})
    custom = dict(metadata.get("custom_presence") or {})
    style_dna = dict(custom.get("style_dna") or {})
    public_style_dna = dict(custom.get("public_style_dna") or {})
    source_reference = dict(custom.get("source_site_reference") or {})

    metadata["custom_renderer_key"] = GGM_RENDERER_KEY
    custom.update(
        {
            "schema_version": custom.get("schema_version") or "custom-presence-style-dna-v1",
            "custom_renderer_key": GGM_RENDERER_KEY,
            "renderer_key": GGM_RENDERER_KEY,
            "fidelity_status": "hosted_cutover_pending_owner_signoff",
            "metadata_cutover": {
                "controlled_launch_pilot": True,
                "pilot_code": "ggm",
                "environment": environment,
                "created_by": CREATED_BY,
            },
        }
    )
    source_reference.update(
        {
            "reference_id": "ggm-source-site",
            "label": "GGM artist portfolio",
            "public_url": "https://christina-goddard.vercel.app/",
        }
    )
    style_dna["renderer_key"] = GGM_RENDERER_KEY
    public_style_dna["renderer_key"] = GGM_RENDERER_KEY
    public_style_dna.setdefault("entry", "artwork_first")
    custom["source_site_reference"] = source_reference
    custom["style_dna"] = style_dna
    custom["public_style_dna"] = public_style_dna
    metadata["custom_presence"] = custom
    return metadata


def _summary(room, metadata: dict[str, Any] | None, *, mode: str, environment: str, changed: bool) -> dict[str, Any]:
    metadata = metadata or {}
    custom = metadata.get("custom_presence") if isinstance(metadata, dict) else {}
    custom = custom if isinstance(custom, dict) else {}
    public_style = custom.get("public_style_dna") if isinstance(custom.get("public_style_dna"), dict) else {}
    style = custom.get("style_dna") if isinstance(custom.get("style_dna"), dict) else {}
    return {
        "mode": mode,
        "environment": environment,
        "room_id": room.id,
        "room_slug": room.slug,
        "room_public": room.status == "published" and room.visibility == "public",
        "changed": changed,
        "renderer_key": metadata.get("custom_renderer_key"),
        "custom_presence_renderer_key": custom.get("renderer_key"),
        "style_dna_renderer_key": style.get("renderer_key"),
        "public_style_dna_renderer_key": public_style.get("renderer_key"),
        "signature_fallback_required": not (
            metadata.get("custom_renderer_key") == GGM_RENDERER_KEY
            and style.get("renderer_key") == GGM_RENDERER_KEY
            and public_style.get("renderer_key") == GGM_RENDERER_KEY
        ),
        "secret_values_printed": False,
    }


def _run(app, args: argparse.Namespace) -> dict[str, Any]:
    with app.app_context():
        from manara_backend_app.extensions import db
        from manara_backend_app.models import PresenceNode
        from manara_backend_app.services.presence_service import normalize_presence_metadata

        room = PresenceNode.query.filter_by(slug=args.room_slug).first()
        if not room:
            raise RuntimeError(f"GGM Room slug {args.room_slug!r} was not found.")
        if args.room_id is not None and room.id != args.room_id:
            raise RuntimeError(f"GGM Room slug {args.room_slug!r} resolved to unexpected id {room.id}.")
        if not isinstance(room.node_metadata, dict) or room.node_metadata.get("pilot_code") != "ggm":
            raise RuntimeError("Target Room is missing the expected GGM pilot tag.")

        next_metadata = normalize_presence_metadata(_renderer_metadata(room.node_metadata, args.environment))
        changed = next_metadata != room.node_metadata
        if args.apply and changed:
            room.node_metadata = next_metadata
            db.session.commit()
        elif args.apply:
            db.session.rollback()
        summary_metadata = room.node_metadata if args.apply else next_metadata
        return _summary(
            room,
            summary_metadata,
            mode="apply" if args.apply else "dry_run",
            environment=args.environment,
            changed=changed,
        )


def _write_result(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Persist explicit GGM faithful renderer metadata on the tagged pilot Room.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="Inspect the tagged GGM pilot Room and proposed metadata.")
    mode.add_argument("--apply", action="store_true", help="Update only the tagged GGM pilot Room metadata.")
    parser.add_argument("--environment", choices=("local", "hosted_controlled_launch"), default="local")
    parser.add_argument("--backend-env-file", type=Path, default=DEFAULT_BACKEND_ENV)
    parser.add_argument("--output-json", type=Path, default=DEFAULT_RESULT)
    parser.add_argument("--room-slug", default=GGM_ROOM_SLUG)
    parser.add_argument("--room-id", type=int)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _args(argv)
    if args.environment == "hosted_controlled_launch":
        _load_env_file(args.backend_env_file)
    app = _build_app(_database_url(args.environment))
    result = _run(app, args)
    payload = {"renderer_metadata": result, "secret_values_printed": False}
    _write_result(args.output_json, payload)
    print(json.dumps({"output_json": str(args.output_json), **payload}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
