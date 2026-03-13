import base64
import hashlib
from cryptography.fernet import Fernet, InvalidToken


def _normalize_fernet_key(key: bytes | str) -> tuple[bytes, bool]:
    if isinstance(key, str):
        raw = key.encode("utf-8")
    else:
        raw = key

    try:
        Fernet(raw)
        return raw, False
    except Exception:
        pass

    try:
        decoded = bytes.fromhex(raw.decode("ascii"))
        if len(decoded) == 32:
            return base64.urlsafe_b64encode(decoded), True
    except Exception:
        pass

    return base64.urlsafe_b64encode(hashlib.sha256(raw).digest()), True


class EncryptionManager:
    def __init__(self):
        self._fernet = None

    def init_app(self, app):
        key = app.config.get("ENCRYPTION_MASTER_KEY")
        if key:
            normalized_key, normalized = _normalize_fernet_key(key)
            if normalized:
                app.logger.warning(
                    "ENCRYPTION_MASTER_KEY was normalized into a Fernet-compatible key format"
                )
            self._fernet = Fernet(normalized_key)

    def encrypt(self, plaintext: str) -> str:
        if plaintext is None:
            return None
        if not self._fernet:
            return plaintext
        token = self._fernet.encrypt(plaintext.encode("utf-8"))
        return token.decode("utf-8")

    def decrypt(self, ciphertext: str) -> str:
        if ciphertext is None:
            return None
        if not self._fernet:
            return ciphertext
        try:
            plain = self._fernet.decrypt(ciphertext.encode("utf-8"))
            return plain.decode("utf-8")
        except InvalidToken:
            return None


def generate_key() -> str:
    return Fernet.generate_key().decode("utf-8")
