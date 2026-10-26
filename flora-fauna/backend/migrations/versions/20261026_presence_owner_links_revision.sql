-- Apply before deploying the draft-links revision contract. PostgreSQL source schema.
ALTER TABLE presence_node
    ADD COLUMN IF NOT EXISTS links_revision INTEGER NOT NULL DEFAULT 1;

-- Repair visible/currently published legacy rows that had no publication stamp.
-- A row already returned to private draft cannot be inferred from current state;
-- those require an operator audit before being treated as never-published.
UPDATE presence_node
SET published_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
WHERE published_at IS NULL
  AND (public_status = 'public' OR status = 'published');

-- Re-run this file before re-enabling writes after any rollback to a server
-- version that may have changed links without maintaining links_revision.
-- Invalidating every prior If-Match token closes that rollback/re-upgrade ABA.
UPDATE presence_node SET links_revision = links_revision + 1;
