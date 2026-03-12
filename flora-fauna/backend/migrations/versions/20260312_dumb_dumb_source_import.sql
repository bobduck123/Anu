-- Dumb Dumb Mode: store-link source metadata for wishlist import/share flows

ALTER TABLE dumb_dumb_item ADD COLUMN source_url VARCHAR(500);
ALTER TABLE dumb_dumb_item ADD COLUMN source_site_name VARCHAR(120);
