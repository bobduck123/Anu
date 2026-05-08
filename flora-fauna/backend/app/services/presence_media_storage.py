"""Owner-scoped Presence media storage helpers."""

from __future__ import annotations

import os
import uuid
from dataclasses import dataclass
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
    return sniffed, size


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


def _store_supabase(file: FileStorage, path: str, content_type: str, size: int) -> StoredPresenceMedia | None:
    backend = _storage_backend_name()
    if backend == "local":
        return None
    if current_app.config.get("TESTING") and backend != "supabase":
        return None
    supabase_url, service_key, bucket = _supabase_settings()
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
    public_url = f"{supabase_url}/storage/v1/object/public/{quote(bucket, safe='')}/{quote(path, safe='/')}"
    return StoredPresenceMedia(
        url=public_url,
        storage_path=path,
        backend="supabase",
        content_type=content_type,
        size=size,
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
    )


def store_presence_image(file: FileStorage, *, storage_path: str) -> StoredPresenceMedia:
    content_type, size = validate_presence_image(file)
    stored = _store_supabase(file, storage_path, content_type, size)
    if stored:
        return stored
    if _production_storage_required():
        raise PresenceMediaStorageError("Presence media storage is not configured for production.")
    return _store_local(file, storage_path, content_type, size)
