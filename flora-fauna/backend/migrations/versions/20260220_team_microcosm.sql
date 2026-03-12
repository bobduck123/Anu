-- Link teams to microcosms (micromicrocosms)

ALTER TABLE team ADD COLUMN microcosm_id INTEGER;
CREATE INDEX IF NOT EXISTS ix_team_microcosm_id ON team (microcosm_id);
