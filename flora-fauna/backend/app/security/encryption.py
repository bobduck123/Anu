import base64
from cryptography.fernet import Fernet, InvalidToken


class EncryptionManager:
    def __init__(self):
        self._fernet = None

    def init_app(self, app):
        key = app.config.get("ENCRYPTION_MASTER_KEY")
        if key:
            if isinstance(key, str):
                key = key.encode("utf-8")
            self._fernet = Fernet(key)

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
