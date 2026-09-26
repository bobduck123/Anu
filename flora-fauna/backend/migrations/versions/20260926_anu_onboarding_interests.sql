-- ANU-003: private participant interests for the confirmed onboarding journey.
-- Deployment of this migration is a separate, human-approved operation.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS onboarding_interests_json JSONB;
