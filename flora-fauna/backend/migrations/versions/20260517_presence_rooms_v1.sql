-- Presence Rooms v1
-- Add room-specific controlled fields on top of existing Presence Nodes.

ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS room_type VARCHAR(80);
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS theme_preset VARCHAR(80);
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS accent_color VARCHAR(24);
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS public_status VARCHAR(40);
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS hero_title VARCHAR(220);
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS hero_subtitle VARCHAR(320);
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS hero_image_url VARCHAR(700);
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS short_bio TEXT;
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS long_story TEXT;
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS enquiry_email VARCHAR(180);
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS availability_status VARCHAR(80);
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS featured_notice TEXT;
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS media_embeds JSONB;
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS seo_title VARCHAR(180);
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS seo_description VARCHAR(280);
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS social_preview_image_url VARCHAR(700);

CREATE INDEX IF NOT EXISTS ix_presence_node_room_type ON presence_node(room_type);
CREATE INDEX IF NOT EXISTS ix_presence_node_theme_preset ON presence_node(theme_preset);
CREATE INDEX IF NOT EXISTS ix_presence_node_public_status ON presence_node(public_status);

ALTER TABLE presence_enquiry ADD COLUMN IF NOT EXISTS source_room_slug VARCHAR(180);
ALTER TABLE presence_enquiry ADD COLUMN IF NOT EXISTS routed_to_email VARCHAR(180);
ALTER TABLE presence_enquiry ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(40);
