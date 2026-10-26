"""Offline, repeatable SQLite upgrade for the owner links revision contract.

Run only against a stopped, backed-up local SQLite service. Never point this at
a hosted database. Each run bumps every link revision, including re-upgrades
after an older server version may have written links without bumping it.
"""

import argparse
from datetime import datetime, timezone
from pathlib import Path
import sqlite3


LINK_COLUMNS = ["id", "node_id", "label", "url", "link_type", "icon", "sort_order", "is_visible"]
LINK_INDEXES = {"ix_presence_link_node_order", "ix_presence_link_type"}


def upgrade(path: Path) -> Path:
    path = path.resolve(strict=True)
    if not path.is_file():
        raise ValueError("The SQLite target must be an existing file.")
    backup = path.with_name(path.name + ".before-links-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ") + ".bak")
    db = sqlite3.connect(path, timeout=10)
    try:
        tables = {row[0]: row[1] for row in db.execute(
            "SELECT name, sql FROM sqlite_master WHERE type='table' AND name IN ('presence_node','presence_link')")}
        if set(tables) != {"presence_node", "presence_link"}:
            raise ValueError("Expected presence_node and presence_link tables.")
        columns = [row[1] for row in db.execute("PRAGMA table_info(presence_link)")]
        if columns != LINK_COLUMNS:
            raise ValueError("Unexpected presence_link columns; manual schema review required.")
        link_objects = {(row[0], row[1]) for row in db.execute(
            "SELECT type, name FROM sqlite_master WHERE tbl_name='presence_link' AND type IN ('index','trigger')")}
        if link_objects - {("index", name) for name in LINK_INDEXES}:
            raise ValueError("Unexpected presence_link indexes or triggers; manual schema review required.")
        for (table,) in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"):
            if any(row[2] == "presence_link" for row in db.execute(f'PRAGMA foreign_key_list("{table.replace(chr(34), chr(34) * 2)}")')):
                raise ValueError("Inbound presence_link foreign key requires manual schema review.")

        # sqlite3's backup API includes committed WAL content. The caller must
        # still stop all writers before this backup and keep them stopped.
        with sqlite3.connect(backup) as saved:
            db.backup(saved)
        db.execute("PRAGMA foreign_keys=OFF")
        db.execute("BEGIN EXCLUSIVE")
        try:
            node_columns = {row[1] for row in db.execute("PRAGMA table_info(presence_node)")}
            if "links_revision" not in node_columns:
                db.execute("ALTER TABLE presence_node ADD COLUMN links_revision INTEGER NOT NULL DEFAULT 1")
            elif any(row[0] is None or row[0] < 1 for row in db.execute("SELECT links_revision FROM presence_node")):
                raise ValueError("Invalid existing links_revision; manual repair required.")

            db.execute("""UPDATE presence_node
                SET published_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
                WHERE published_at IS NULL AND (public_status = 'public' OR status = 'published')""")
            if "AUTOINCREMENT" not in tables["presence_link"].upper():
                db.execute("""CREATE TABLE presence_link_rebuild (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    node_id INTEGER NOT NULL REFERENCES presence_node(id),
                    label VARCHAR(120) NOT NULL,
                    url VARCHAR(700) NOT NULL,
                    link_type VARCHAR(80) NOT NULL DEFAULT 'website',
                    icon VARCHAR(80),
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    is_visible BOOLEAN NOT NULL DEFAULT 1
                )""")
                db.execute("""INSERT INTO presence_link_rebuild
                    (id,node_id,label,url,link_type,icon,sort_order,is_visible)
                    SELECT id,node_id,label,url,link_type,icon,sort_order,is_visible FROM presence_link""")
                db.execute("DROP TABLE presence_link")
                db.execute("ALTER TABLE presence_link_rebuild RENAME TO presence_link")
                db.execute("CREATE INDEX ix_presence_link_node_order ON presence_link(node_id, sort_order)")
                db.execute("CREATE INDEX ix_presence_link_type ON presence_link(link_type)")

            # Invalidate every pre-upgrade If-Match value, including after a
            # rollback to code that did not maintain this column.
            db.execute("UPDATE presence_node SET links_revision = links_revision + 1")
            if db.execute("PRAGMA foreign_key_check").fetchone():
                raise ValueError("Foreign key check failed; database left unchanged.")
            if db.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                raise ValueError("Integrity check failed; database left unchanged.")
            db.commit()
        except Exception:
            db.rollback()
            raise
        return backup
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database", type=Path, help="existing, offline SQLite database file")
    parser.add_argument("--apply", action="store_true", help="required to modify the file and create a backup")
    parser.add_argument("--offline-confirmed", action="store_true", help="confirm all application writers are stopped")
    args = parser.parse_args()
    if not (args.apply and args.offline_confirmed):
        parser.error("--apply and --offline-confirmed are both required")
    print(f"Upgrade complete. Pre-upgrade backup: {upgrade(args.database)}")
