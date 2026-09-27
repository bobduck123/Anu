import { Prisma, PrismaClient } from '@prisma/client';
import {
  latestWeeklySlot, runTrackedWeeklyDigest, WEEKLY_DIGEST_JOB, weeklyDigestStatus
} from '../src/jobs/trackedWeeklyDigest';
import type { WeeklyDigestSummary } from '../src/jobs/weeklyDigest';
import { collectWeeklyDigest } from '../src/jobs/weeklyDigest';

const slot = new Date('2026-09-21T08:00:00.000Z');
const now = new Date('2026-09-21T08:01:00.000Z');
const summary: WeeklyDigestSummary = {
  period: { from: '2026-09-14T08:00:00.000Z', to: slot.toISOString() },
  metrics: {
    newSubscriptions: 2, activeSubscriptions: 3, creditsGranted: 4,
    poolContributionsDollars: '1.25', activePools: 5
  }
};

function fakeDatabase() {
  type Row = {
    id: string; jobName: string; scheduledAt: Date; status: string; attempts: number;
    startedAt: Date; finishedAt: Date | null; result: unknown; error: string | null;
    lastFailedAt?: Date | null; lastFailureCode?: string | null;
  };
  let row: Row | null = null;
  let denyNextClaim = false;
  const create = jest.fn(async ({ data }: { data: Partial<Row> }) => {
    if (row) {
      throw new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002', clientVersion: '7.5.0'
      });
    }
    row = {
      id: 'receipt-1', jobName: data.jobName!, scheduledAt: data.scheduledAt!,
      status: data.status!, attempts: 1, startedAt: data.startedAt!,
      finishedAt: null, result: null, error: null
    };
    return { ...row };
  });
  const updateMany = jest.fn(async ({ where, data }: { where: any; data: any }) => {
    if (!row || row.id !== where.id || (where.status && row.status !== where.status) ||
        (where.attempts !== undefined && row.attempts !== where.attempts) ||
        (where.startedAt instanceof Date && row.startedAt.getTime() !== where.startedAt.getTime()) ||
        (where.startedAt?.lt && row.startedAt >= where.startedAt.lt) || denyNextClaim) {
      denyNextClaim = false;
      return { count: 0 };
    }
    row = {
      ...row, ...data,
      attempts: data.attempts?.increment ? row.attempts + data.attempts.increment : row.attempts
    };
    return { count: 1 };
  });
  const prisma = {
    scheduledJobRun: {
      create, updateMany,
      findUniqueOrThrow: jest.fn(async () => {
        if (!row) throw new Error('missing');
        return { ...row };
      }),
      findFirst: jest.fn(async ({ where }: {
        where: { status?: string; lastFailedAt?: { not: null } }
      }) => row && (!where.status || row.status === where.status) &&
        (!where.lastFailedAt || row.lastFailedAt) ? { ...row } : null),
      findMany: jest.fn(async ({ where }: { where: { status?: string } }) =>
        row && (!where.status || row.status === where.status) ? [{ ...row }] : [])
    }
  } as unknown as PrismaClient;
  return {
    prisma, create, updateMany,
    get row() { return row; },
    set row(value: Row | null) { row = value; },
    denyNextClaim() { denyNextClaim = true; }
  };
}

describe('tracked weekly digest', () => {
  test('one successful slot is processed once and exposes last success', async () => {
    const db = fakeDatabase();
    const collect = jest.fn(async () => summary);
    expect(await runTrackedWeeklyDigest(db.prisma, slot, now, collect)).toMatchObject({
      status: 'succeeded', attempts: 1
    });
    expect(await runTrackedWeeklyDigest(db.prisma, slot, now, collect)).toEqual({
      status: 'skipped', attempts: 1, reason: 'succeeded'
    });
    expect(collect).toHaveBeenCalledTimes(1);
    expect((await weeklyDigestStatus(db.prisma)).lastSuccess).toMatchObject({ attempts: 1 });
  });

  test('failure is visible, can retry, and stops after three attempts', async () => {
    const db = fakeDatabase();
    const collect = jest.fn(async () => { throw new TypeError('private detail'); });
    for (let attempt = 1; attempt <= 3; attempt++) {
      await expect(runTrackedWeeklyDigest(db.prisma, slot, now, collect)).rejects.toThrow(TypeError);
      expect(db.row).toMatchObject({ status: 'failed', attempts: attempt, error: 'TypeError' });
    }
    expect(await runTrackedWeeklyDigest(db.prisma, slot, now, collect)).toEqual({
      status: 'skipped', attempts: 3, reason: 'retry_limit'
    });
    expect(collect).toHaveBeenCalledTimes(3);
    expect((await weeklyDigestStatus(db.prisma)).recentFailures).toHaveLength(1);
    expect((await weeklyDigestStatus(db.prisma)).lastFailure).toMatchObject({
      lastFailureCode: 'TypeError', attempts: 3
    });
    expect(JSON.stringify(db.row)).not.toContain('private detail');
  });

  test('last failure remains visible after a successful retry', async () => {
    const db = fakeDatabase();
    await expect(runTrackedWeeklyDigest(db.prisma, slot, now, async () => {
      throw new TypeError('private detail');
    })).rejects.toThrow(TypeError);
    expect(await runTrackedWeeklyDigest(db.prisma, slot, now, async () => summary))
      .toMatchObject({ status: 'succeeded', attempts: 2 });
    const status = await weeklyDigestStatus(db.prisma);
    expect(status.lastSuccess).toMatchObject({ attempts: 2 });
    expect(status.lastFailure).toMatchObject({
      status: 'succeeded', lastFailureCode: 'TypeError', attempts: 2
    });
    expect(status.recentFailures).toHaveLength(0);
  });

  test('running lease prevents concurrent work; stale lease can be recovered', async () => {
    const db = fakeDatabase();
    db.row = {
      id: 'receipt-1', jobName: WEEKLY_DIGEST_JOB, scheduledAt: slot, status: 'running',
      attempts: 1, startedAt: new Date(now.getTime() - 10 * 60 * 1000),
      finishedAt: null, result: null, error: null
    };
    const collect = jest.fn(async () => summary);
    expect(await runTrackedWeeklyDigest(db.prisma, slot, now, collect)).toMatchObject({
      status: 'skipped', reason: 'running'
    });
    expect(collect).not.toHaveBeenCalled();
    expect(await runTrackedWeeklyDigest(db.prisma, slot, new Date(now.getTime() + 20 * 60 * 1000), collect))
      .toMatchObject({ status: 'succeeded', attempts: 2 });
  });

  test('conditional claim lost to another worker never runs the summary', async () => {
    const db = fakeDatabase();
    db.row = {
      id: 'receipt-1', jobName: WEEKLY_DIGEST_JOB, scheduledAt: slot, status: 'failed',
      attempts: 1, startedAt: now, finishedAt: now, result: null, error: 'TypeError'
    };
    db.denyNextClaim();
    const collect = jest.fn(async () => summary);
    expect(await runTrackedWeeklyDigest(db.prisma, slot, now, collect)).toMatchObject({
      status: 'skipped', reason: 'claimed_elsewhere'
    });
    expect(collect).not.toHaveBeenCalled();
  });

  test('a worker whose lease expired cannot overwrite the recovered result', async () => {
    const db = fakeDatabase();
    let release!: () => void;
    const oldCollect = jest.fn(() => new Promise<WeeklyDigestSummary>((resolve) => {
      release = () => resolve(summary);
    }));
    const first = runTrackedWeeklyDigest(db.prisma, slot, now, oldCollect);
    await new Promise((resolve) => setImmediate(resolve));
    expect(oldCollect).toHaveBeenCalledTimes(1);
    const later = new Date(now.getTime() + 20 * 60 * 1000);
    expect(await runTrackedWeeklyDigest(db.prisma, slot, later, async () => summary))
      .toMatchObject({ status: 'succeeded', attempts: 2 });
    release();
    await expect(first).rejects.toThrow('JobClaimLost');
    expect(db.row).toMatchObject({ status: 'succeeded', attempts: 2 });
  });

  test('slot validation and latest Monday boundary', async () => {
    expect(latestWeeklySlot(new Date('2026-09-21T07:59:59.000Z')).toISOString())
      .toBe('2026-09-14T08:00:00.000Z');
    expect(latestWeeklySlot(now).toISOString()).toBe(slot.toISOString());
    const db = fakeDatabase();
    await expect(runTrackedWeeklyDigest(db.prisma, new Date('2026-09-21T09:00:00Z'), now))
      .rejects.toThrow('Slot must be');
    expect(db.create).not.toHaveBeenCalled();
  });

  test('summary queries use the fixed slot window and return aggregates only', async () => {
    const subscriptions = jest.fn()
      .mockResolvedValueOnce(2).mockResolvedValueOnce(3);
    const credits = jest.fn().mockResolvedValue({ _sum: { amountCredits: 4 } });
    const pools = jest.fn().mockResolvedValue({ _sum: { amountCents: 125 } });
    const prisma = {
      subscription: { count: subscriptions },
      impactCreditTransaction: { aggregate: credits },
      impactLedgerEntry: { aggregate: pools },
      impactPool: { count: jest.fn().mockResolvedValue(5) }
    } as unknown as PrismaClient;
    expect(await collectWeeklyDigest(prisma, slot)).toEqual(summary);
    expect(subscriptions).toHaveBeenCalledWith({
      where: { createdAt: { gte: new Date(summary.period.from), lt: slot } }
    });
    expect(credits).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ createdAt: { gte: new Date(summary.period.from), lt: slot } })
    }));
  });
});
