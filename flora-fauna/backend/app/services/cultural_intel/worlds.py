from __future__ import annotations

import base64
import hashlib
import json
import os
import re
from datetime import timedelta
from pathlib import Path
from typing import Any

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from flask import current_app, has_app_context

from ...extensions import db
from ...models import WorldPatch, WorldSigningKey, WorldSnapshot
from ...security.observability import observe_world_verify_result
from ...time_utils import now_utc


SAFE_KEY_ID = re.compile(r"^[a-zA-Z0-9._:-]{1,120}$")


def _canonical_json(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def manifest_hash(payload: dict[str, Any]) -> str:
    return hashlib.sha256(_canonical_json(payload)).hexdigest()


def _instance_root() -> Path:
    return Path(os.getcwd()) / "instance"


def _config(name: str, fallback: str | None = None) -> str | None:
    if has_app_context():
        return current_app.config.get(name) or fallback
    return os.environ.get(name, fallback)


def _resolve_storage_root() -> Path:
    root = Path(_config("WORLD_STORAGE_ROOT", "static/worlds") or "static/worlds")
    if not root.is_absolute():
        root = Path(os.getcwd()) / root
    root.mkdir(parents=True, exist_ok=True)
    return root


def _snapshot_artifact_path(world_id: str, version: int) -> Path:
    return _resolve_storage_root() / world_id / f"v{int(version)}" / "manifest.json"


def _default_key_paths() -> tuple[Path, Path]:
    private_path = _config("WORLD_SIGNING_PRIVATE_KEY_FILE")
    public_path = _config("WORLD_SIGNING_PUBLIC_KEY_FILE")
    if private_path and public_path:
        return Path(private_path), Path(public_path)

    base = _instance_root()
    base.mkdir(parents=True, exist_ok=True)
    return base / "world_signing_ed25519_private.pem", base / "world_signing_ed25519_public.pem"


def _world_key_dir() -> Path:
    key_dir = _instance_root() / "world_keys"
    key_dir.mkdir(parents=True, exist_ok=True)
    return key_dir


def _load_private_key(path: Path) -> Ed25519PrivateKey:
    private_key = serialization.load_pem_private_key(path.read_bytes(), password=None)
    if not isinstance(private_key, Ed25519PrivateKey):
        raise ValueError("World signing key type must be Ed25519")
    return private_key


def _load_public_key(path: Path) -> Ed25519PublicKey:
    public_key = serialization.load_pem_public_key(path.read_bytes())
    if not isinstance(public_key, Ed25519PublicKey):
        raise ValueError("World signing key type must be Ed25519")
    return public_key


def _load_or_generate_default_keys() -> tuple[Ed25519PrivateKey, Ed25519PublicKey]:
    private_path, public_path = _default_key_paths()
    if private_path.exists() and public_path.exists():
        return _load_private_key(private_path), _load_public_key(public_path)

    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key()
    private_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    private_path.parent.mkdir(parents=True, exist_ok=True)
    public_path.parent.mkdir(parents=True, exist_ok=True)
    private_path.write_bytes(private_bytes)
    public_path.write_bytes(public_bytes)
    return private_key, public_key


def _public_key_raw_b64(public_key: Ed25519PublicKey) -> str:
    raw = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    return base64.b64encode(raw).decode("utf-8")


def _load_public_key_from_pem(pem_text: str) -> Ed25519PublicKey:
    key = serialization.load_pem_public_key(pem_text.encode("utf-8"))
    if not isinstance(key, Ed25519PublicKey):
        raise ValueError("World signing key type must be Ed25519")
    return key


def _active_signing_key_row() -> WorldSigningKey | None:
    if not has_app_context():
        return None
    now = now_utc()
    try:
        return (
            WorldSigningKey.query.filter(
                WorldSigningKey.is_active.is_(True),
                (WorldSigningKey.valid_to.is_(None) | (WorldSigningKey.valid_to >= now)),
            )
            .order_by(WorldSigningKey.id.desc())
            .first()
        )
    except Exception:
        return None


def _resolve_signing_key_for_publish() -> tuple[Ed25519PrivateKey, Ed25519PublicKey, str]:
    row = _active_signing_key_row()
    if row and row.private_key_file:
        private_path = Path(row.private_key_file)
        if private_path.exists():
            private_key = _load_private_key(private_path)
            public_key = _load_public_key_from_pem(row.public_key_pem)
            return private_key, public_key, row.key_id

    private_key, public_key = _load_or_generate_default_keys()
    key_id = _config("WORLD_SIGNING_KEY_ID", "dev-ed25519") or "dev-ed25519"
    return private_key, public_key, key_id


def _verification_key_candidates(signature_key_id: str | None = None) -> list[tuple[str, Ed25519PublicKey]]:
    keys: list[tuple[str, Ed25519PublicKey]] = []
    seen: set[str] = set()

    now = now_utc()
    if has_app_context():
        try:
            rows = (
                WorldSigningKey.query.filter(
                    (WorldSigningKey.valid_to.is_(None) | (WorldSigningKey.valid_to >= now))
                )
                .order_by(WorldSigningKey.is_active.desc(), WorldSigningKey.id.desc())
                .all()
            )
            if signature_key_id:
                exact = [row for row in rows if row.key_id == signature_key_id]
                rows = exact + [row for row in rows if row.key_id != signature_key_id]
            for row in rows:
                try:
                    pub = _load_public_key_from_pem(row.public_key_pem)
                except Exception:
                    continue
                cache_key = f"db:{row.key_id}:{_public_key_raw_b64(pub)}"
                if cache_key in seen:
                    continue
                seen.add(cache_key)
                keys.append((row.key_id, pub))
        except Exception:
            pass

    try:
        _, fallback_pub = _load_or_generate_default_keys()
        fallback_key_id = _config("WORLD_SIGNING_KEY_ID", "dev-ed25519") or "dev-ed25519"
        cache_key = f"default:{fallback_key_id}:{_public_key_raw_b64(fallback_pub)}"
        if cache_key not in seen:
            keys.append((fallback_key_id, fallback_pub))
    except Exception:
        pass

    return keys


def sign_payload(payload: dict[str, Any]) -> dict[str, str]:
    private_key, public_key, key_id = _resolve_signing_key_for_publish()
    signature = base64.b64encode(private_key.sign(_canonical_json(payload))).decode("utf-8")
    return {
        "signature": signature,
        "signature_key_id": key_id,
        "public_key_raw_b64": _public_key_raw_b64(public_key),
    }


def verify_signed_payload(
    payload: dict[str, Any],
    signature_b64: str,
    signature_key_id: str | None = None,
) -> bool:
    for _key_id, public_key in _verification_key_candidates(signature_key_id=signature_key_id):
        try:
            public_key.verify(base64.b64decode(signature_b64), _canonical_json(payload))
            return True
        except Exception:
            continue
    return False


def list_world_signing_keys() -> list[dict[str, Any]]:
    rows: list[WorldSigningKey] = []
    if has_app_context():
        rows = WorldSigningKey.query.order_by(WorldSigningKey.id.desc()).all()
    payload = [
        {
            "id": row.id,
            "key_id": row.key_id,
            "is_active": bool(row.is_active),
            "valid_from": row.valid_from.isoformat() if row.valid_from else None,
            "valid_to": row.valid_to.isoformat() if row.valid_to else None,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "private_key_file": row.private_key_file,
        }
        for row in rows
    ]
    if not payload:
        _, public_key = _load_or_generate_default_keys()
        payload.append(
            {
                "id": None,
                "key_id": _config("WORLD_SIGNING_KEY_ID", "dev-ed25519") or "dev-ed25519",
                "is_active": True,
                "valid_from": None,
                "valid_to": None,
                "created_at": None,
                "private_key_file": str(_default_key_paths()[0]),
                "public_key_raw_b64": _public_key_raw_b64(public_key),
            }
        )
    return payload


def rotate_world_signing_key(new_key_id: str, actor_id: int | None = None, grace_days: int = 30) -> dict[str, Any]:
    key_id = (new_key_id or "").strip()
    if not SAFE_KEY_ID.match(key_id):
        raise ValueError("new_key_id contains invalid characters")

    existing = WorldSigningKey.query.filter_by(key_id=key_id).first()
    if existing:
        raise ValueError("new_key_id already exists")

    now = now_utc()
    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key()
    private_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )

    key_dir = _world_key_dir()
    private_path = key_dir / f"{key_id}_private.pem"
    public_path = key_dir / f"{key_id}_public.pem"
    private_path.write_bytes(private_bytes)
    public_path.write_bytes(public_bytes)

    current_active = WorldSigningKey.query.filter_by(is_active=True).all()
    grace_days = max(0, int(grace_days))
    for row in current_active:
        row.is_active = False
        if row.valid_to is None:
            row.valid_to = now + timedelta(days=grace_days)

    row = WorldSigningKey(
        key_id=key_id,
        public_key_pem=public_bytes.decode("utf-8"),
        private_key_file=str(private_path),
        is_active=True,
        valid_from=now,
        valid_to=None,
        rotated_by=actor_id,
    )
    db.session.add(row)
    db.session.flush()
    return {
        "id": row.id,
        "key_id": row.key_id,
        "private_key_file": row.private_key_file,
        "public_key_file": str(public_path),
        "public_key_raw_b64": _public_key_raw_b64(public_key),
        "valid_from": row.valid_from.isoformat() if row.valid_from else None,
    }


def publish_snapshot(world_id: str, payload: dict[str, Any], actor_id: int | None = None) -> dict[str, Any]:
    latest = (
        WorldSnapshot.query.filter_by(world_id=world_id)
        .order_by(WorldSnapshot.version.desc())
        .first()
    )
    version = int(payload.get("version") or ((latest.version + 1) if latest else 1))
    if latest and version <= latest.version:
        version = latest.version + 1

    manifest = {
        "world_id": world_id,
        "version": version,
        "asset_list": payload.get("asset_list") or [],
        "scene_graph": payload.get("scene_graph") or {},
        "semantic_map": payload.get("semantic_map") or {},
        "layers": payload.get("layers") or {},
        "permissions_manifest": payload.get("permissions_manifest") or {},
        "education_links": payload.get("education_links") or {},
        "meta": payload.get("meta") or {},
    }
    manifest_sha = manifest_hash(manifest)
    signing = sign_payload(manifest)
    signature = signing["signature"]
    key_id = signing["signature_key_id"]

    snapshot = WorldSnapshot(
        world_id=world_id,
        version=version,
        scene_graph_json=manifest["scene_graph"],
        semantic_map_json=manifest["semantic_map"],
        layers_json=manifest["layers"],
        permissions_manifest_json=manifest["permissions_manifest"],
        education_links_json=manifest["education_links"],
        asset_list_json=manifest["asset_list"],
        snapshot_manifest_json=manifest["meta"],
        manifest_hash=manifest_sha,
        signature=signature,
        signature_key_id=key_id,
        published_by=actor_id,
    )
    db.session.add(snapshot)
    db.session.flush()

    world_root = _resolve_storage_root() / world_id / f"v{version}"
    world_root.mkdir(parents=True, exist_ok=True)
    (world_root / "manifest.json").write_text(
        json.dumps(
            {
                **manifest,
                "manifest_hash": manifest_sha,
                "signature": signature,
                "signature_key_id": key_id,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    db.session.flush()
    return {
        "snapshot_id": snapshot.id,
        "manifest": manifest,
        "manifest_hash": manifest_sha,
        "signature": signature,
        "signature_key_id": key_id,
        "public_key_raw_b64": signing["public_key_raw_b64"],
    }


def verify_snapshot(manifest: dict[str, Any], signature_b64: str, signature_key_id: str | None = None) -> bool:
    return verify_signed_payload(manifest, signature_b64, signature_key_id=signature_key_id)


def _verify_snapshot_artifact(snapshot: WorldSnapshot, expected_manifest_hash: str) -> dict[str, Any]:
    artifact_path = _snapshot_artifact_path(snapshot.world_id, snapshot.version)
    if not artifact_path.exists():
        return {
            "ok": False,
            "artifact_path": str(artifact_path),
            "artifact_manifest_hash": None,
            "reasons": ["artifact_missing"],
        }
    try:
        raw_payload = json.loads(artifact_path.read_text(encoding="utf-8"))
    except Exception:
        return {
            "ok": False,
            "artifact_path": str(artifact_path),
            "artifact_manifest_hash": None,
            "reasons": ["artifact_unreadable"],
        }

    artifact_manifest = {
        "world_id": raw_payload.get("world_id"),
        "version": raw_payload.get("version"),
        "asset_list": raw_payload.get("asset_list") or [],
        "scene_graph": raw_payload.get("scene_graph") or {},
        "semantic_map": raw_payload.get("semantic_map") or {},
        "layers": raw_payload.get("layers") or {},
        "permissions_manifest": raw_payload.get("permissions_manifest") or {},
        "education_links": raw_payload.get("education_links") or {},
        "meta": raw_payload.get("meta") or {},
    }
    artifact_hash = manifest_hash(artifact_manifest)
    reasons: list[str] = []
    if artifact_hash != expected_manifest_hash:
        reasons.append("artifact_manifest_hash_mismatch")
    if (raw_payload.get("signature") or "") != (snapshot.signature or ""):
        reasons.append("artifact_signature_mismatch")
    if (raw_payload.get("signature_key_id") or "") != (snapshot.signature_key_id or ""):
        reasons.append("artifact_signature_key_mismatch")
    if (raw_payload.get("manifest_hash") or artifact_hash) != expected_manifest_hash:
        reasons.append("artifact_embedded_hash_mismatch")
    return {
        "ok": len(reasons) == 0,
        "artifact_path": str(artifact_path),
        "artifact_manifest_hash": artifact_hash,
        "reasons": reasons,
    }


def get_snapshot(world_id: str, version: int | None = None) -> dict[str, Any] | None:
    query = WorldSnapshot.query.filter_by(world_id=world_id)
    if version is not None:
        snapshot = query.filter_by(version=version).first()
    else:
        snapshot = query.order_by(WorldSnapshot.version.desc()).first()
    if not snapshot:
        return None

    manifest = snapshot.to_manifest()
    signature_valid = verify_snapshot(
        manifest,
        snapshot.signature,
        signature_key_id=snapshot.signature_key_id,
    )
    live_manifest_hash = manifest_hash(manifest)
    expected_manifest_hash = snapshot.manifest_hash or live_manifest_hash
    manifest_hash_valid = live_manifest_hash == expected_manifest_hash
    artifact_verification = _verify_snapshot_artifact(snapshot, expected_manifest_hash)
    reasons: list[str] = []
    if not signature_valid:
        reasons.append("signature_invalid")
    if not manifest_hash_valid:
        reasons.append("manifest_hash_mismatch")
    reasons.extend(artifact_verification.get("reasons") or [])
    verified = bool(signature_valid and manifest_hash_valid and artifact_verification.get("ok"))
    observe_world_verify_result(bool(verified))
    return {
        "world_id": snapshot.world_id,
        "version": snapshot.version,
        "manifest": manifest,
        "manifest_hash": expected_manifest_hash,
        "signature": snapshot.signature,
        "signature_key_id": snapshot.signature_key_id,
        "verified": bool(verified),
        "verification": {
            "signature_valid": bool(signature_valid),
            "manifest_hash_valid": bool(manifest_hash_valid),
            "artifact_valid": bool(artifact_verification.get("ok")),
            "artifact_path": artifact_verification.get("artifact_path"),
            "artifact_manifest_hash": artifact_verification.get("artifact_manifest_hash"),
            "reasons": reasons,
        },
        "created_at": snapshot.created_at.isoformat() if snapshot.created_at else None,
    }


def create_patch(
    world_id: str,
    from_version: int,
    to_version: int,
    operations: list[dict[str, Any]],
    actor_id: int | None = None,
) -> WorldPatch:
    patch = WorldPatch(
        world_id=world_id,
        from_version=from_version,
        to_version=to_version,
        operations_json=operations or [],
        created_by=actor_id,
    )
    db.session.add(patch)
    db.session.flush()
    return patch


def get_patches(world_id: str, since_version: int | None = None) -> list[dict[str, Any]]:
    query = WorldPatch.query.filter_by(world_id=world_id)
    if since_version is not None:
        query = query.filter(WorldPatch.to_version > int(since_version))
    rows = query.order_by(WorldPatch.to_version.asc()).all()
    return [row.to_dict() for row in rows]
