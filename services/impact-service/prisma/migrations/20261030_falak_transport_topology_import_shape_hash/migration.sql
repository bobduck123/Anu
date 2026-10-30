-- Gate 2 import change detection. Additive; existing patterns are unaffected.
ALTER TABLE falak.transport_patterns ADD COLUMN shape_hash varchar(64);
ALTER TABLE falak.transport_patterns ADD COLUMN source_licence varchar(200);
