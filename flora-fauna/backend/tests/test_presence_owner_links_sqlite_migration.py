"""Disposable-file proof for the explicit offline SQLite upgrade path."""

from pathlib import Path
import sqlite3
import subprocess
import sys


def test_sqlite_upgrade_preserves_rows_and_invalidates_revision_on_reupgrade(tmp_path):
    database = tmp_path / "legacy.db"
    with sqlite3.connect(database) as db:
        db.executescript("""
            CREATE TABLE presence_node (
                id INTEGER PRIMARY KEY, status TEXT, public_status TEXT,
                published_at TIMESTAMP, updated_at TIMESTAMP, created_at TIMESTAMP
            );
            CREATE TABLE presence_link (
                id INTEGER PRIMARY KEY, node_id INTEGER NOT NULL REFERENCES presence_node(id),
                label VARCHAR(120) NOT NULL, url VARCHAR(700) NOT NULL,
                link_type VARCHAR(80) NOT NULL DEFAULT 'website', icon VARCHAR(80),
                sort_order INTEGER NOT NULL DEFAULT 0, is_visible BOOLEAN NOT NULL DEFAULT 1
            );
            CREATE INDEX ix_presence_link_node_order ON presence_link(node_id, sort_order);
            CREATE INDEX ix_presence_link_type ON presence_link(link_type);
            INSERT INTO presence_node VALUES (1, 'published', 'public', NULL, '2026-10-01', '2026-09-01');
            INSERT INTO presence_link VALUES (12, 1, 'Shop', 'https://example.org', 'website', NULL, 0, 1);
        """)

    script = Path(__file__).resolve().parents[1] / "scripts" / "migrate_presence_owner_links_sqlite.py"
    command = [sys.executable, str(script), str(database), "--apply", "--offline-confirmed"]
    assert subprocess.run(command, capture_output=True, text=True).returncode == 0
    with sqlite3.connect(database) as db:
        assert db.execute("SELECT links_revision, published_at FROM presence_node").fetchone() == (2, "2026-10-01")
        assert "AUTOINCREMENT" in db.execute("SELECT sql FROM sqlite_master WHERE name='presence_link'").fetchone()[0]
        assert db.execute("SELECT id, label FROM presence_link").fetchone() == (12, "Shop")
        db.execute("DELETE FROM presence_link")
        db.execute("INSERT INTO presence_link (node_id,label,url) VALUES (1,'New','https://example.org/new')")
        assert db.execute("SELECT id FROM presence_link").fetchone()[0] > 12

    assert subprocess.run(command, capture_output=True, text=True).returncode == 0
    with sqlite3.connect(database) as db:
        assert db.execute("SELECT links_revision FROM presence_node").fetchone()[0] == 3
    assert len(list(tmp_path.glob("legacy.db.before-links-*.bak"))) == 2
