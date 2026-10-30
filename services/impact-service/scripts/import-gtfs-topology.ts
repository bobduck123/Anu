import { readGtfsTopology } from '../src/falak/transport/gtfsTopology';
import { importGtfsTopology, TransportImportOptions, validateImportOptions } from '../src/falak/transport/importGtfsTopology';
import { createPrismaClient } from '../src/lib/prisma';

function argument(name: string): string {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith('--')) throw new Error(`Missing --${name}`);
  return value;
}

async function main(): Promise<void> {
  const directory = argument('directory');
  const options: TransportImportOptions = {
    tenantId: argument('tenant-id'),
    sourceSlug: argument('source-slug'),
    sourceVersion: argument('source-version'),
    sourceAttribution: argument('source-attribution'),
    sourceLicence: argument('source-licence'),
    sourceUrl: argument('source-url'),
    networkExternalId: argument('network-id'),
    networkName: argument('network-name')
  };
  validateImportOptions(options);
  const topology = await readGtfsTopology(directory);
  if (!process.argv.includes('--apply')) {
    process.stdout.write(JSON.stringify({
      mode: 'dry-run', source: options.sourceSlug, version: options.sourceVersion,
      stations: topology.stations.length, lines: topology.lines.length,
      patterns: topology.patterns.length, database_writes: 0
    }, null, 2) + '\n');
    return;
  }
  const prisma = createPrismaClient();
  try {
    const report = await importGtfsTopology(prisma, topology, options);
    process.stdout.write(JSON.stringify({ mode: 'applied', ...report }, null, 2) + '\n');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`GTFS import failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
