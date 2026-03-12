import os
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()

migrate = Migrate()

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100 per minute"],
    storage_uri=os.environ.get("RATELIMIT_STORAGE_URI") or "memory://",
)


class SchedulerStub:
    def init_app(self, app):
        return None


scheduler = SchedulerStub()
