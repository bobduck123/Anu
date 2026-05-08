-- Migration: PresenceEnquiry submitter_user_id
-- Date: 2026-05-08
-- ANU-native integration foundation: when an authenticated ANU user submits
-- a Presence enquiry, this column links the enquiry record back to their
-- ANU User row. Used for:
--   - resolving enquiries to ANU accounts in Studio
--   - future direct-message thread linkage between submitter and node owner
--   - internal notification routing
--
-- Anonymous enquiries continue to work; the column is NULLABLE.
-- email is no longer absolutely required at the model layer when the
-- visitor chose a non-email preferred_contact_method. This is validated at
-- the service layer; existing rows are unaffected.

ALTER TABLE presence_enquiry
    ADD COLUMN IF NOT EXISTS submitter_user_id INTEGER REFERENCES "user"(id);

CREATE INDEX IF NOT EXISTS ix_presence_enquiry_submitter_user_id
    ON presence_enquiry (submitter_user_id);

-- Relax the email NOT NULL constraint so phone-preferred and handle-preferred
-- enquiries can succeed without a fake email. Service-layer validation
-- guarantees at least one contact route is present.
ALTER TABLE presence_enquiry
    ALTER COLUMN email DROP NOT NULL;
