"""Owner-scoped Presence media storage helpers."""

from __future__ import annotations

import os
import hashlib
import hmac
import shutil
import struct
import time
import uuid
from dataclasses import dataclass, replace
from pathlib import Path
from urllib.parse import quote

import requests
from flask import current_app, request
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename


ALLOWED_IMAGE_MIME_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}
MAX_PRESENCE_MEDIA_BYTES = 8 * 1024 * 1024


@dataclass(frozen=True)
class StoredPresenceMedia:
    url: str
    storage_path: str
    backend: str
    content_type: str
    size: int
    visibility: str = "public_unlisted"
    bucket: str | None = None
    width: int | None = None
    height: int | None = None
    checksum_sha256: str | None = None


class PresenceMediaValidationError(ValueError):
    pass


class PresenceMediaStorageError(RuntimeError):
    pass


def _max_bytes() -> int:
    configured = current_app.config.get("PRESENCE_MEDIA_MAX_BYTES") or os.environ.get("PRESENCE_MEDIA_MAX_BYTES")
    try:
        value = int(configured) if configured else MAX_PRESENCE_MEDIA_BYTES
    except (TypeError, ValueError):
        value = MAX_PRESENCE_MEDIA_BYTES
    return min(max(value, 1), MAX_PRESENCE_MEDIA_BYTES)


def _file_size(file: FileStorage) -> int:
    file.stream.seek(0, os.SEEK_END)
    size = file.stream.tell()
    file.stream.seek(0)
    return int(size or 0)


def _sniff_image_type(file: FileStorage) -> str | None:
    header = file.stream.read(16)
    file.stream.seek(0)
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(header) >= 12 and header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "image/webp"
    return None


def validate_presence_image(file: FileStorage) -> tuple[str, int]:
    if not file or not file.filename:
        raise PresenceMediaValidationError("Choose a JPG, PNG, or WEBP image to upload.")
    size = _file_size(file)
    max_bytes = _max_bytes()
    if size <= 0:
        raise PresenceMediaValidationError("The selected image is empty.")
    if size > max_bytes:
        mb = max_bytes // (1024 * 1024)
        raise PresenceMediaValidationError(f"Image is too large. Upload an image under {mb}MB.")

    sniffed = _sniff_image_type(file)
    declared = (file.mimetype or "").lower()
    if sniffed not in ALLOWED_IMAGE_MIME_TYPES:
        raise PresenceMediaValidationError("Only JPG, PNG, and WEBP images are accepted.")
    if declared and declared not in ALLOWED_IMAGE_MIME_TYPES:
        raise PresenceMediaValidationError("Only JPG, PNG, and WEBP images are accepted.")
    if declared and declared != sniffed:
        raise PresenceMediaValidationError("This file type does not match the image contents.")
    filename = secure_filename(file.filename or "").lower()
    extension = filename.rsplit(".", 1)[-1] if "." in filename else ""
    permitted_extensions = {"image/jpeg": {"jpg", "jpeg"}, "image/png": {"png"}, "image/webp": {"webp"}}
    if extension not in permitted_extensions[sniffed]:
        raise PresenceMediaValidationError("This file name does not match the image type.")
    return sniffed, size


def inspect_presence_image(file: FileStorage, content_type: str) -> tuple[int | None, int | None, str]:
    body = file.stream.read()
    file.stream.seek(0)
    width: int | None = None
    height: int | None = None
    if content_type == "image/png" and len(body) >= 24 and body[12:16] == b"IHDR":
        width, height = struct.unpack(">II", body[16:24])
    elif content_type == "image/jpeg":
        cursor = 2
        while cursor + 9 < len(body):
            if body[cursor] != 0xFF:
                cursor += 1
                continue
            marker = body[cursor + 1]
            if marker in {0xC0, 0xC1, 0xC2, 0xC3}:
                height, width = struct.unpack(">HH", body[cursor + 5:cursor + 9])
                break
            if cursor + 4 > len(body):
                break
            block_size = struct.unpack(">H", body[cursor + 2:cursor + 4])[0]
            cursor += max(block_size + 2, 2)
    elif content_type == "image/webp" and len(body) >= 30 and body[12:16] == b"VP8X":
        width = int.from_bytes(body[24:27], "little") + 1
        height = int.from_bytes(body[27:30], "little") + 1
    if not width or not height:
        width = height = None
    return width, height, hashlib.sha256(body).hexdigest()


def build_presence_media_path(
    *,
    owner_user_id: int,
    node_id: int,
    target_type: str,
    filename: str,
    work_id: int | None = None,
    collection_id: int | None = None,
) -> str:
    safe_name = secure_filename(filename or "image").lower() or "image"
    suffix = safe_name.rsplit(".", 1)[-1] if "." in safe_name else "jpg"
    if suffix == "jpeg":
        suffix = "jpg"
    if suffix not in {"jpg", "png", "webp"}:
        suffix = "jpg"
    unique_name = f"{uuid.uuid4().hex}.{suffix}"
    if target_type == "editor_private_draft":
        return "/".join(["presence", "draft", "rooms", str(node_id), unique_name])
    if target_type == "editor_draft":
        # These image URLs may become visitor-visible after publish. Keep
        # owner identity out of the storage path while access stays checked
        # by the authenticated room upload endpoint.
        return "/".join(["presence", "rooms", str(node_id), "images", unique_name])
    parts = ["presence", str(owner_user_id), str(node_id)]
    if target_type == "profile_image":
        parts.append("profile")
    elif target_type == "cover_image":
        parts.append("cover")
    elif target_type == "landing_background":
        parts.append("landing")
    elif target_type == "work_image" and work_id is not None:
        parts.extend(["works", str(work_id)])
    elif target_type == "collection_cover" and collection_id is not None:
        parts.extend(["collections", str(collection_id)])
    else:
        parts.append("misc")
    parts.append(unique_name)
    return "/".join(parts)


def _supabase_settings() -> tuple[str | None, str | None, str]:
    url = (
        current_app.config.get("SUPABASE_URL")
        or os.environ.get("SUPABASE_URL")
        or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    )
    service_key = current_app.config.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    bucket = current_app.config.get("PRESENCE_MEDIA_BUCKET") or os.environ.get("PRESENCE_MEDIA_BUCKET") or "presence-media"
    return (str(url).rstrip("/") if url else None, service_key, str(bucket))


def _private_draft_bucket() -> str | None:
    bucket = current_app.config.get("PRESENCE_MEDIA_DRAFT_BUCKET") or os.environ.get("PRESENCE_MEDIA_DRAFT_BUCKET")
    return str(bucket).strip() if bucket else None


def _storage_backend_name() -> str:
    return str(
        current_app.config.get("PRESENCE_MEDIA_STORAGE_BACKEND")
        or os.environ.get("PRESENCE_MEDIA_STORAGE_BACKEND")
        or ""
    ).strip().lower()


def _production_storage_required() -> bool:
    if current_app.config.get("TESTING"):
        return False
    env = str(
        current_app.config.get("VERCEL_ENV")
        or os.environ.get("VERCEL_ENV")
        or current_app.config.get("FLASK_ENV")
        or os.environ.get("FLASK_ENV")
        or ""
    ).strip().lower()
    return env == "production" and _storage_backend_name() != "local"


def private_draft_storage_enabled() -> bool:
    backend = _storage_backend_name()
    if backend == "local":
        return bool(current_app.config.get("PRESENCE_MEDIA_PRIVATE_DRAFT_ENABLED"))
    supabase_url, service_key, _bucket = _supabase_settings()
    return bool(_private_draft_bucket() and supabase_url and service_key)


def _store_supabase(
    file: FileStorage,
    path: str,
    content_type: str,
    size: int,
    *,
    bucket_override: str | None = None,
    is_public: bool = True,
) -> StoredPresenceMedia | None:
    backend = _storage_backend_name()
    if backend == "local":
        return None
    if current_app.config.get("TESTING") and backend != "supabase":
        return None
    supabase_url, service_key, default_bucket = _supabase_settings()
    bucket = bucket_override or default_bucket
    if not supabase_url or not service_key:
        return None
    body = file.stream.read()
    file.stream.seek(0)
    object_url = f"{supabase_url}/storage/v1/object/{quote(bucket, safe='')}/{quote(path, safe='/')}"
    response = requests.put(
        object_url,
        data=body,
        headers={
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
            "Content-Type": content_type,
            "x-upsert": "true",
        },
        timeout=20,
    )
    if response.status_code not in (200, 201):
        raise PresenceMediaStorageError("Media storage is temporarily unavailable.")
    if not is_public:
        anonymous_read = requests.get(
            f"{supabase_url}/storage/v1/object/public/{quote(bucket, safe='')}/{quote(path, safe='/')}",
            timeout=10,
        )
        if anonymous_read.status_code not in (400, 401, 403, 404):
            requests.delete(
                object_url,
                headers={"Authorization": f"Bearer {service_key}", "apikey": service_key},
                timeout=10,
            )
            raise PresenceMediaStorageError("Protected draft image storage is not private. Upload was rejected.")
    public_url = (
        f"{supabase_url}/storage/v1/object/public/{quote(bucket, safe='')}/{quote(path, safe='/')}"
        if is_public
        else ""
    )
    return StoredPresenceMedia(
        url=public_url,
        storage_path=path,
        backend="supabase" if is_public else "supabase-private",
        content_type=content_type,
        size=size,
        visibility="public_unlisted" if is_public else "private_draft",
        bucket=bucket,
    )


def _store_local(file: FileStorage, path: str, content_type: str, size: int) -> StoredPresenceMedia:
    upload_root = Path(current_app.config.get("UPLOAD_FOLDER") or "static/uploads")
    destination = upload_root / Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    file.save(destination)
    base = request.host_url.rstrip("/")
    return StoredPresenceMedia(
        url=f"{base}/media/uploads/{quote(path, safe='/')}",
        storage_path=path,
        backend="local",
        content_type=content_type,
        size=size,
        visibility="public_unlisted",
    )


def _private_local_root() -> Path:
    configured = current_app.config.get("PRESENCE_MEDIA_PRIVATE_FOLDER")
    if configured:
        return Path(str(configured))
    return Path(current_app.instance_path) / "presence-private-media"


def _store_local_private(file: FileStorage, path: str, content_type: str, size: int) -> StoredPresenceMedia:
    destination = _private_local_root() / Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    file.save(destination)
    return StoredPresenceMedia(
        url="",
        storage_path=path,
        backend="local-private",
        content_type=content_type,
        size=size,
        visibility="private_draft",
    )


def store_presence_image(file: FileStorage, *, storage_path: str) -> StoredPresenceMedia:
    content_type, size = validate_presence_image(file)
    width, height, checksum = inspect_presence_image(file, content_type)
    stored = _store_supabase(file, storage_path, content_type, size)
    if stored:
        return replace(stored, width=width, height=height, checksum_sha256=checksum)
    if _production_storage_required():
        raise PresenceMediaStorageError("Presence media storage is not configured for production.")
    return replace(
        _store_local(file, storage_path, content_type, size),
        width=width,
        height=height,
        checksum_sha256=checksum,
    )


def store_presence_draft_image(file: FileStorage, *, storage_path: str) -> StoredPresenceMedia:
    """Store a protected draft original when configured; otherwise retain V1B posture."""
    if not private_draft_storage_enabled():
        if _private_draft_bucket():
            raise PresenceMediaStorageError("Protected draft image storage is configured incompletely.")
        return store_presence_image(file, storage_path=storage_path)
    content_type, size = validate_presence_image(file)
    width, height, checksum = inspect_presence_image(file, content_type)
    if _storage_backend_name() == "local":
        stored = _store_local_private(file, storage_path, content_type, size)
    else:
        stored = _store_supabase(
            file,
            storage_path,
            content_type,
            size,
            bucket_override=_private_draft_bucket(),
            is_public=False,
        )
        if stored is None:
            raise PresenceMediaStorageError("Protected draft image storage is unavailable.")
    return replace(stored, width=width, height=height, checksum_sha256=checksum)


def _local_signature(media_id: str, storage_path: str, expires_at: int) -> str:
    secret = str(current_app.config.get("SECRET_KEY") or "presence-media-preview-secret")
    message = f"{media_id}:{storage_path}:{expires_at}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()


def draft_media_read_url(media_asset) -> tuple[str, int | None]:
    if getattr(media_asset, "visibility", "") != "private_draft":
        return str(getattr(media_asset, "public_url", "") or ""), None
    expires_at = int(time.time()) + int(current_app.config.get("PRESENCE_MEDIA_SIGNED_URL_TTL_SECONDS") or 900)
    if getattr(media_asset, "storage_backend", "") == "supabase-private":
        supabase_url, service_key, _public_bucket = _supabase_settings()
        bucket = _private_draft_bucket()
        if not supabase_url or not service_key or not bucket:
            raise PresenceMediaStorageError("Protected draft image preview is unavailable.")
        response = requests.post(
            f"{supabase_url}/storage/v1/object/sign/{quote(bucket, safe='')}/{quote(media_asset.draft_storage_key, safe='/')}",
            json={"expiresIn": expires_at - int(time.time())},
            headers={"Authorization": f"Bearer {service_key}", "apikey": service_key},
            timeout=15,
        )
        if response.status_code not in (200, 201):
            raise PresenceMediaStorageError("Protected draft image preview is unavailable.")
        signed = str((response.json() or {}).get("signedURL") or (response.json() or {}).get("signedUrl") or "")
        if not signed:
            raise PresenceMediaStorageError("Protected draft image preview is unavailable.")
        if signed.startswith("http"):
            return signed, expires_at
        prefix = "" if signed.startswith("/storage/v1") else "/storage/v1"
        return f"{supabase_url}{prefix}{signed}", expires_at
    signature = _local_signature(media_asset.id, media_asset.draft_storage_key, expires_at)
    base = request.host_url.rstrip("/")
    return f"{base}/api/presence/media/private/{media_asset.id}?expires={expires_at}&signature={signature}", expires_at


def verify_private_media_signature(media_asset, expires_at: str | None, signature: str | None) -> bool:
    try:
        expiry = int(str(expires_at or ""))
    except ValueError:
        return False
    if expiry < int(time.time()):
        return False
    expected = _local_signature(media_asset.id, media_asset.draft_storage_key, expiry)
    return bool(signature) and hmac.compare_digest(expected, str(signature))


def private_local_media_path(media_asset) -> Path | None:
    if getattr(media_asset, "storage_backend", "") != "local-private":
        return None
    root = _private_local_root().resolve()
    path = (root / Path(media_asset.draft_storage_key)).resolve()
    if root not in path.parents:
        return None
    return path


def promote_presence_media(media_asset, *, room_id: int) -> StoredPresenceMedia:
    if getattr(media_asset, "visibility", "") != "private_draft":
        return StoredPresenceMedia(
            url=str(getattr(media_asset, "public_url", "") or ""),
            storage_path=str(getattr(media_asset, "published_storage_key", "") or getattr(media_asset, "draft_storage_key", "")),
            backend=str(getattr(media_asset, "storage_backend", "") or "existing"),
            content_type=str(getattr(media_asset, "mime_type", "") or "image/jpeg"),
            size=int(getattr(media_asset, "size_bytes", 0) or 0),
            visibility="public_published",
        )
    suffix = str(media_asset.draft_storage_key or "").rsplit(".", 1)[-1].lower()
    if suffix not in {"jpg", "png", "webp"}:
        suffix = ALLOWED_IMAGE_MIME_TYPES.get(str(media_asset.mime_type), "jpg")
    public_path = f"presence/published/rooms/{room_id}/{media_asset.id}/display.{suffix}"
    if media_asset.storage_backend == "supabase-private":
        supabase_url, service_key, public_bucket = _supabase_settings()
        draft_bucket = _private_draft_bucket()
        if not supabase_url or not service_key or not draft_bucket:
            raise PresenceMediaStorageError("This image could not be prepared for visitors.")
        source = requests.get(
            f"{supabase_url}/storage/v1/object/{quote(draft_bucket, safe='')}/{quote(media_asset.draft_storage_key, safe='/')}",
            headers={"Authorization": f"Bearer {service_key}", "apikey": service_key},
            timeout=20,
        )
        if source.status_code != 200:
            raise PresenceMediaStorageError("This image could not be prepared for visitors.")
        target = requests.put(
            f"{supabase_url}/storage/v1/object/{quote(public_bucket, safe='')}/{quote(public_path, safe='/')}",
            data=source.content,
            headers={
                "Authorization": f"Bearer {service_key}",
                "apikey": service_key,
                "Content-Type": media_asset.mime_type,
                "x-upsert": "true",
            },
            timeout=20,
        )
        if target.status_code not in (200, 201):
            raise PresenceMediaStorageError("This image could not be prepared for visitors.")
        url = f"{supabase_url}/storage/v1/object/public/{quote(public_bucket, safe='')}/{quote(public_path, safe='/')}"
        return StoredPresenceMedia(url, public_path, "supabase", media_asset.mime_type, media_asset.size_bytes, "public_published", public_bucket)
    source_path = private_local_media_path(media_asset)
    if not source_path or not source_path.exists():
        raise PresenceMediaStorageError("This image could not be prepared for visitors.")
    public_root = Path(current_app.config.get("UPLOAD_FOLDER") or "static/uploads")
    destination = public_root / Path(public_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source_path, destination)
    url = f"{request.host_url.rstrip('/')}/media/uploads/{quote(public_path, safe='/')}"
    return StoredPresenceMedia(url, public_path, "local", media_asset.mime_type, media_asset.size_bytes, "public_published")


def delete_private_media_object(media_asset) -> bool:
    if getattr(media_asset, "visibility", "") != "private_draft":
        return False
    if media_asset.storage_backend == "local-private":
        path = private_local_media_path(media_asset)
        if path and path.exists():
            path.unlink()
        return True
    if media_asset.storage_backend == "supabase-private":
        supabase_url, service_key, _public_bucket = _supabase_settings()
        bucket = _private_draft_bucket()
        if not supabase_url or not service_key or not bucket:
            raise PresenceMediaStorageError("Protected image cleanup is unavailable.")
        response = requests.delete(
            f"{supabase_url}/storage/v1/object/{quote(bucket, safe='')}/{quote(media_asset.draft_storage_key, safe='/')}",
            headers={"Authorization": f"Bearer {service_key}", "apikey": service_key},
            timeout=15,
        )
        if response.status_code not in (200, 204, 404):
            raise PresenceMediaStorageError("Protected image cleanup is unavailable.")
        return True
    return False
