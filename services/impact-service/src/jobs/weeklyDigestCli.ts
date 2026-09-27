import { disconnectPrisma, hasDatabase, requirePrismaClient } from '../lib/prisma';
import { latestWeeklySlot, runTrackedWeeklyDigest, weeklyDigestStatus } from './trackedWeeklyDigest';

async function main(): Promise<void> {
  const [command, slotArg] = process.argv.slice(2);
  if ((command !== 'run' && command !== 'status') ||
      (command === 'status' && slotArg) || process.argv.length > 4) {
    process.stderr.write('Usage: npm run job:weekly -- run [Monday-08:00-UTC-ISO] | status\n');
    process.exitCode = 2;
    return;
  }
  if (!hasDatabase()) {
    process.stderr.write('Weekly job requires a configured database connection.\n');
    process.exitCode = 1;
    return;
  }
  const prisma = requirePrismaClient();
  try {
    if (command === 'status') {
      process.stdout.write(`${JSON.stringify(await weeklyDigestStatus(prisma))}\n`);
    } else {
      const now = new Date();
      const slot = slotArg ? new Date(slotArg) : latestWeeklySlot(now);
      process.stdout.write(`${JSON.stringify(await runTrackedWeeklyDigest(prisma, slot, now))}\n`);
    }
  } finally {
    await disconnectPrisma();
  }
}

main().catch((error: unknown) => {
  // Operational output contains an error class only; database URLs and row data stay out of logs.
  const message = error instanceof Error && error.message === 'Slot must be a past Monday at 08:00:00.000 UTC'
    ? error.message
    : error instanceof Error ? error.name : 'UnknownError';
  process.stderr.write(`Weekly job failed: ${message}\n`);
  process.exitCode = 1;
});
