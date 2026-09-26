-- Apply after 20260926_anu_action_commitments.sql. Historical rows are not backfilled.
ALTER TABLE action_commitment ADD COLUMN IF NOT EXISTS awarded_points INTEGER;
ALTER TABLE action_commitment ADD COLUMN IF NOT EXISTS points_awarded_at TIMESTAMP;
