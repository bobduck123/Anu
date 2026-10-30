import { join } from 'path';
import { parseGtfsCsv, readGtfsTopology } from '../../src/falak/transport/gtfsTopology';
import { validateImportOptions } from '../../src/falak/transport/importGtfsTopology';

const fixture = join(__dirname, '..', 'fixtures', 'gtfs-rail');

test('parses a synthetic branching rail network with shared canonical stations', async () => {
  const first = await readGtfsTopology(fixture);
  const second = await readGtfsTopology(fixture);
  expect(first).toEqual(second);
  expect(first.lines.map((line) => line.externalId)).toEqual(['L1', 'L2']);
  expect(first.stations.map((station) => station.externalId)).toEqual(['C', 'E', 'N', 'R']);
  expect(first.patterns).toHaveLength(3);
  expect(first.patterns.find((pattern) => pattern.stationExternalIds.join(',') === 'C,R,E,R')).toBeDefined();
  expect(first.patterns.filter((pattern) => pattern.stationExternalIds.includes('R'))).toHaveLength(3);
  expect(first.patterns.every((pattern) => pattern.geometry?.coordinates.length && pattern.geometry.coordinates.length >= 2)).toBe(true);
});

test('handles quoted CSV and rejects malformed or incomplete source data', () => {
  expect(parseGtfsCsv('id,name\n1,"Newtown, Sydney"\n2,"A ""quoted"" name"\n', ['id', 'name']))
    .toEqual([{ id: '1', name: 'Newtown, Sydney' }, { id: '2', name: 'A "quoted" name' }]);
  expect(() => parseGtfsCsv('id,name\n1,"unclosed', ['id', 'name'])).toThrow(/Unterminated/);
  expect(() => parseGtfsCsv('id\n1\n', ['id', 'name'])).toThrow(/missing required/);
});

test('requires attribution and an explicit source before database import', () => {
  expect(() => validateImportOptions({
    tenantId: '11111111-1111-4111-8111-111111111111', sourceSlug: 'tfnsw',
    sourceVersion: 'fixture', sourceAttribution: '', sourceLicence: '', sourceUrl: 'http://example.test',
    networkExternalId: 'sydney', networkName: 'Sydney rail'
  })).toThrow(/sourceVersion/);
});
