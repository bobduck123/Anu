import { Prisma, PrismaClient } from '@prisma/client';
import { collectWeeklyDigest, WeeklyDigestSummary } from './weeklyDigest';

export const WEEKLY_DIGEST_JOB = 'weekly_digest_summary';
const MAX_ATTEMPTS = 3;
const LEASE_MS = 15 * 60 * 1000;

export type TrackedDigestResult =
  | { status: 'succeeded'; attempts: number; summary: WeeklyDigestSummary }
  | { status: 'skipped'; attempts: number; reason: 'succeeded' | 'running' | 'retry_limit' | 'claimed_elsewhere' };

export function latestWeeklySlot(now: Date): Date {
  const slot = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 8));
  slot.setUTCDate(slot.getUTCDate() - ((slot.getUTCDay() + 6) % 7));
  if (slot.getTime() > now.getTime()) slot.setUTCDate(slot.getUTCDate() - 7);
  return slot;
}

function validateSlot(slot: Date, now: Date): void {
  if (Number.isNaN(slot.getTime()) || slot.getUTCDay() !== 1 ||
      slot.getUTCHours() !== 8 || slot.getUTCMinutes() !== 0 ||
      slot.getUTCSeconds() !== 0 || slot.getUTCMilliseconds() !== 0 ||
      slot.getTime() > now.getTime()) {
    throw new Error('Slot must be a past Monday at 08:00:00.000 UTC');
  }
}

function safeError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error &&
      typeof error.code === 'string' && /^P\d{4}$/.test(error.code)) {
    return error.code;
  }
  return error instanceof Error ? error.name.slice(0, 120) : 'UnknownError';
}

/** Explicit invocation only. A unique slot plus conditional updates serialise claims. */
export async function runTrackedWeeklyDigest(
  prisma: PrismaClient,
  slot: Date,
  now: Date = new Date(),
  collect: typeof collectWeeklyDigest = collectWeeklyDigest
): Promise<TrackedDigestResult> {
  validateSlot(slot, now);
  let claim;
  try {
    claim = await prisma.scheduledJobRun.create({
      data: { jobName: WEEKLY_DIGEST_JOB, scheduledAt: slot, status: 'running', startedAt: now }
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
    const existing = await prisma.scheduledJobRun.findUniqueOrThrow({
      where: { jobName_scheduledAt: { jobName: WEEKLY_DIGEST_JOB, scheduledAt: slot } }
    });
    if (existing.status === 'succeeded') {
      return { status: 'skipped', attempts: existing.attempts, reason: 'succeeded' };
    }
    if (existing.attempts >= MAX_ATTEMPTS) {
      return { status: 'skipped', attempts: existing.attempts, reason: 'retry_limit' };
    }
    const staleBefore = new Date(now.getTime() - LEASE_MS);
    if (existing.status === 'running' && existing.startedAt >= staleBefore) {
      return { status: 'skipped', attempts: existing.attempts, reason: 'running' };
    }
    const allowedState = existing.status === 'failed'
      ? { status: 'failed', attempts: existing.attempts }
      : { status: 'running', attempts: existing.attempts, startedAt: { lt: staleBefore } };
    const acquired = await prisma.scheduledJobRun.updateMany({
      where: { id: existing.id, ...allowedState },
      data: {
        status: 'running', attempts: { increment: 1 }, startedAt: now,
        finishedAt: null, result: Prisma.JsonNull, error: null
      }
    });
    if (acquired.count !== 1) {
      return { status: 'skipped', attempts: existing.attempts, reason: 'claimed_elsewhere' };
    }
    claim = { ...existing, status: 'running', attempts: existing.attempts + 1, startedAt: now };
  }

  try {
    const summary = await collect(prisma, slot);
    const finished = await prisma.scheduledJobRun.updateMany({
      where: { id: claim.id, status: 'running', attempts: claim.attempts, startedAt: claim.startedAt },
      data: { status: 'succeeded', finishedAt: new Date(), result: summary as unknown as Prisma.InputJsonValue }
    });
    if (finished.count !== 1) throw new Error('JobClaimLost');
    return { status: 'succeeded', attempts: claim.attempts, summary };
  } catch (error) {
    await prisma.scheduledJobRun.updateMany({
      where: { id: claim.id, status: 'running', attempts: claim.attempts, startedAt: claim.startedAt },
      data: {
        status: 'failed', finishedAt: new Date(), error: safeError(error),
        lastFailedAt: new Date(), lastFailureCode: safeError(error)
      }
    });
    throw error;
  }
}

export async function weeklyDigestStatus(prisma: PrismaClient) {
  const [lastSuccess, recentFailures, lastFailure, latestRun] = await Promise.all([
    prisma.scheduledJobRun.findFirst({
      where: { jobName: WEEKLY_DIGEST_JOB, status: 'succeeded' },
      orderBy: { scheduledAt: 'desc' }, select: { scheduledAt: true, finishedAt: true, attempts: true }
    }),
    prisma.scheduledJobRun.findMany({
      where: { jobName: WEEKLY_DIGEST_JOB, status: 'failed' },
      orderBy: { scheduledAt: 'desc' }, take: 5,
      select: { scheduledAt: true, finishedAt: true, attempts: true, error: true }
    }),
    prisma.scheduledJobRun.findFirst({
      where: { jobName: WEEKLY_DIGEST_JOB, lastFailedAt: { not: null } },
      orderBy: { lastFailedAt: 'desc' },
      select: { scheduledAt: true, lastFailedAt: true, lastFailureCode: true, attempts: true, status: true }
    }),
    prisma.scheduledJobRun.findFirst({
      where: { jobName: WEEKLY_DIGEST_JOB }, orderBy: { scheduledAt: 'desc' },
      select: { scheduledAt: true, status: true, attempts: true, startedAt: true, finishedAt: true }
    })
  ]);
  return { jobName: WEEKLY_DIGEST_JOB, lastSuccess, lastFailure, recentFailures, latestRun };
}
