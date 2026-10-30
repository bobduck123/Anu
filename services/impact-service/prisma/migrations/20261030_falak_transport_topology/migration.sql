-- Additive Falak topology: network, line and station identities stay in falak.nodes.
CREATE TABLE falak.transport_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES falak.tenants(id) ON DELETE RESTRICT,
  network_node_id uuid NOT NULL REFERENCES falak.nodes(id) ON DELETE RESTRICT,
  line_node_id uuid NOT NULL REFERENCES falak.nodes(id) ON DELETE RESTRICT,
  source_slug varchar(120) NOT NULL,
  external_id varchar(180) NOT NULL,
  label varchar(220) NOT NULL,
  direction varchar(80),
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retired')),
  source_version varchar(120),
  source_attribution varchar(300),
  source_url varchar(700),
  imported_at timestamptz,
  geometry falak.geometry(LineString,4326),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_transport_pattern_source UNIQUE (tenant_id, source_slug, external_id),
  CONSTRAINT ck_transport_pattern_source CHECK (length(trim(source_slug)) > 0 AND length(trim(external_id)) > 0)
);

CREATE INDEX ix_transport_pattern_network ON falak.transport_patterns(tenant_id, network_node_id, status);
CREATE INDEX ix_transport_pattern_line ON falak.transport_patterns(tenant_id, line_node_id, status);
CREATE INDEX ix_transport_pattern_geometry ON falak.transport_patterns USING gist(geometry);

CREATE TABLE falak.transport_pattern_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id uuid NOT NULL REFERENCES falak.transport_patterns(id) ON DELETE CASCADE,
  sequence integer NOT NULL CHECK (sequence >= 0),
  station_node_id uuid NOT NULL REFERENCES falak.nodes(id) ON DELETE RESTRICT,
  source_stop_id varchar(180),
  distance_meters integer CHECK (distance_meters IS NULL OR distance_meters >= 0),
  CONSTRAINT uq_transport_pattern_call_sequence UNIQUE (pattern_id, sequence)
);

CREATE INDEX ix_transport_pattern_call_station ON falak.transport_pattern_calls(station_node_id);

-- FKs alone do not protect tenant and type semantics. Reject cross-tenant or
-- mis-typed references even when a future importer bypasses the API layer.
CREATE FUNCTION falak.validate_transport_pattern_scope() RETURNS trigger AS $$
DECLARE network_type text; network_tenant uuid; line_type text; line_tenant uuid;
BEGIN
  SELECT type, tenant_id INTO network_type, network_tenant FROM falak.nodes WHERE id = NEW.network_node_id;
  SELECT type, tenant_id INTO line_type, line_tenant FROM falak.nodes WHERE id = NEW.line_node_id;
  IF network_type IS DISTINCT FROM 'transport_network' OR line_type IS DISTINCT FROM 'transport_line'
     OR network_tenant IS DISTINCT FROM NEW.tenant_id OR line_tenant IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'transport pattern network and line must be typed nodes in the same tenant';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_transport_pattern_scope
BEFORE INSERT OR UPDATE ON falak.transport_patterns
FOR EACH ROW EXECUTE FUNCTION falak.validate_transport_pattern_scope();

CREATE FUNCTION falak.validate_transport_call_scope() RETURNS trigger AS $$
DECLARE pattern_tenant uuid; station_type text; station_tenant uuid;
BEGIN
  SELECT tenant_id INTO pattern_tenant FROM falak.transport_patterns WHERE id = NEW.pattern_id;
  SELECT type, tenant_id INTO station_type, station_tenant FROM falak.nodes WHERE id = NEW.station_node_id;
  IF station_type IS DISTINCT FROM 'transport_station' OR station_tenant IS DISTINCT FROM pattern_tenant THEN
    RAISE EXCEPTION 'transport call station must be a typed node in the pattern tenant';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_transport_call_scope
BEFORE INSERT OR UPDATE ON falak.transport_pattern_calls
FOR EACH ROW EXECUTE FUNCTION falak.validate_transport_call_scope();
