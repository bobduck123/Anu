import { createHash } from 'crypto';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';

export interface GtfsStation {
  externalId: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface GtfsLine {
  externalId: string;
  name: string;
}

export interface GtfsPattern {
  externalId: string;
  lineExternalId: string;
  label: string;
  direction: string | null;
  stationExternalIds: string[];
  sourceStopIds: string[];
  geometry: { type: 'LineString'; coordinates: [number, number][] } | null;
}

export interface GtfsTopology {
  stations: GtfsStation[];
  lines: GtfsLine[];
  patterns: GtfsPattern[];
}

type Row = Record<string, string>;

// GTFS CSV allows quoted commas, quotes and newlines. Reject malformed input
// before any database transaction starts.
export function parseGtfsCsv(source: string, required: string[]): Row[] {
  const fields: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const input = source.replace(/^\uFEFF/, '');
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      fields.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error('Unterminated quoted GTFS CSV field');
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''));
    fields.push(row);
  }
  const header = fields.shift();
  if (!header || required.some((column) => !header.includes(column))) {
    throw new Error(`GTFS CSV missing required columns: ${required.filter((column) => !header?.includes(column)).join(', ')}`);
  }
  return fields.filter((values) => values.some((value) => value.length)).map((values, index) => {
    if (values.length !== header.length) throw new Error(`GTFS CSV row ${index + 2} has ${values.length} fields; expected ${header.length}`);
    return Object.fromEntries(header.map((key, column) => [key, values[column]]));
  });
}

async function csv(directory: string, name: string, required: string[], optional = false): Promise<Row[]> {
  let contents: string;
  try {
    const file = join(directory, name);
    if ((await stat(file)).size > 256 * 1024 * 1024) throw new Error(`GTFS ${name} exceeds the 256 MB import limit`);
    contents = await readFile(file, 'utf8');
  } catch (error) {
    if (optional && (error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  return parseGtfsCsv(contents, required);
}

function coordinate(value: string, minimum: number, maximum: number, label: string): number {
  const parsed = Number(value);
  if (!value || !Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`Invalid ${label} in GTFS source`);
  }
  return parsed;
}

function sequence(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`Invalid ${label} in GTFS source`);
  return parsed;
}

export async function readGtfsTopology(directory: string): Promise<GtfsTopology> {
  const [stops, routes, trips, stopTimes, shapes] = await Promise.all([
    csv(directory, 'stops.txt', ['stop_id', 'stop_name', 'stop_lat', 'stop_lon']),
    csv(directory, 'routes.txt', ['route_id', 'route_type']),
    csv(directory, 'trips.txt', ['route_id', 'trip_id']),
    csv(directory, 'stop_times.txt', ['trip_id', 'stop_id', 'stop_sequence']),
    csv(directory, 'shapes.txt', ['shape_id', 'shape_pt_lat', 'shape_pt_lon', 'shape_pt_sequence'], true)
  ]);

  if (stops.some((row) => !row.stop_id || !row.stop_name) ||
      routes.some((row) => !row.route_id || !row.route_type) ||
      trips.some((row) => !row.trip_id || !row.route_id) ||
      stopTimes.some((row) => !row.trip_id || !row.stop_id)) {
    throw new Error('GTFS source contains blank required identifiers or stop names');
  }
  const tripIds = new Set(trips.map((trip) => trip.trip_id));
  if (stopTimes.some((call) => !tripIds.has(call.trip_id))) throw new Error('GTFS stop_time references an unknown trip');

  const stopById = new Map(stops.map((stop) => [stop.stop_id, stop]));
  if (stopById.size !== stops.length) throw new Error('Duplicate GTFS stop_id');
  const railRows = routes.filter((route) => route.route_type === '2');
  const railRoutes = new Map(railRows.map((route) => [route.route_id, route]));
  if (railRoutes.size !== railRows.length) throw new Error('Duplicate GTFS rail route_id');
  if (railRoutes.size === 0) throw new Error('GTFS bundle contains no rail routes (route_type 2)');
  if (tripIds.size !== trips.length) throw new Error('Duplicate GTFS trip_id');
  const stationForStop = (stopId: string): string => {
    const stop = stopById.get(stopId);
    if (!stop) throw new Error(`Unknown GTFS stop_id: ${stopId}`);
    const stationId = stop.parent_station || stopId;
    if (!stopById.has(stationId)) throw new Error(`Unknown GTFS parent_station: ${stationId}`);
    return stationId;
  };

  const callsByTrip = new Map<string, Row[]>();
  for (const call of stopTimes) {
    const calls = callsByTrip.get(call.trip_id) ?? [];
    calls.push(call);
    callsByTrip.set(call.trip_id, calls);
  }
  const pointsByShape = new Map<string, Row[]>();
  for (const point of shapes) {
    const points = pointsByShape.get(point.shape_id) ?? [];
    points.push(point);
    pointsByShape.set(point.shape_id, points);
  }

  const patternByKey = new Map<string, GtfsPattern>();
  const usedStations = new Set<string>();
  const usedLines = new Set<string>();
  for (const trip of trips.sort((left, right) => left.trip_id.localeCompare(right.trip_id))) {
    const route = railRoutes.get(trip.route_id);
    if (!route) continue;
    const calls = (callsByTrip.get(trip.trip_id) ?? []).sort((left, right) => sequence(left.stop_sequence, 'stop_sequence') - sequence(right.stop_sequence, 'stop_sequence'));
    if (calls.length < 2) continue;
    const sequences = calls.map((call) => sequence(call.stop_sequence, 'stop_sequence'));
    if (new Set(sequences).size !== sequences.length) throw new Error(`Duplicate stop_sequence in trip ${trip.trip_id}`);
    const stationExternalIds = calls.map((call) => stationForStop(call.stop_id));
    const shapeId = trip.shape_id || '';
    const direction = trip.direction_id || null;
    const key = JSON.stringify([trip.route_id, direction, shapeId, stationExternalIds]);
    if (patternByKey.has(key)) continue;
    const points = (pointsByShape.get(shapeId) ?? []).sort((left, right) => sequence(left.shape_pt_sequence, 'shape_pt_sequence') - sequence(right.shape_pt_sequence, 'shape_pt_sequence'));
    const coordinates: [number, number][] = points.map((point) => [
      coordinate(point.shape_pt_lon, -180, 180, 'shape_pt_lon'),
      coordinate(point.shape_pt_lat, -90, 90, 'shape_pt_lat')
    ]);
    const externalId = createHash('sha256').update(key).digest('hex').slice(0, 40);
    patternByKey.set(key, {
      externalId,
      lineExternalId: route.route_id,
      label: [route.route_short_name || route.route_long_name || route.route_id, direction].filter(Boolean).join(' · '),
      direction,
      stationExternalIds,
      sourceStopIds: calls.map((call) => call.stop_id),
      geometry: coordinates.length >= 2 ? { type: 'LineString', coordinates } : null
    });
    usedLines.add(route.route_id);
    stationExternalIds.forEach((id) => usedStations.add(id));
  }
  if (patternByKey.size === 0) throw new Error('GTFS bundle contains no usable rail patterns');

  return {
    stations: [...usedStations].sort().map((externalId) => {
      const stop = stopById.get(externalId)!;
      return {
        externalId,
        name: stop.stop_name,
        latitude: coordinate(stop.stop_lat, -90, 90, 'stop_lat'),
        longitude: coordinate(stop.stop_lon, -180, 180, 'stop_lon')
      };
    }),
    lines: [...usedLines].sort().map((externalId) => {
      const route = railRoutes.get(externalId)!;
      return { externalId, name: route.route_short_name || route.route_long_name || externalId };
    }),
    patterns: [...patternByKey.values()].sort((left, right) => left.externalId.localeCompare(right.externalId))
  };
}
