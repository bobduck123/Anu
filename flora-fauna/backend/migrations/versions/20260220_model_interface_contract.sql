-- Model interface contract columns + spectral constraint metadata

ALTER TABLE model_definition ADD COLUMN IF NOT EXISTS required_inputs JSON;
ALTER TABLE model_definition ADD COLUMN IF NOT EXISTS min_sample_size INTEGER;
ALTER TABLE model_definition ADD COLUMN IF NOT EXISTS uncertainty_format VARCHAR(120);
ALTER TABLE model_definition ADD COLUMN IF NOT EXISTS convexity_property VARCHAR(120);
ALTER TABLE model_definition ADD COLUMN IF NOT EXISTS fallback_mode VARCHAR(200);
ALTER TABLE model_definition ADD COLUMN IF NOT EXISTS complexity_bound VARCHAR(200);
ALTER TABLE model_definition ADD COLUMN IF NOT EXISTS update_policy VARCHAR(120);
