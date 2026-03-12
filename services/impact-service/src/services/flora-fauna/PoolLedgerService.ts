import DomainEventService from './DomainEventService';
import {
  CreateLiquidityPoolInput,
  DbClient,
  DEFAULT_POOL_ACCOUNTS,
  DomainActor,
  JOURNAL_KIND_TO_MEMO,
  JournalLineInput,
  assertPositiveCents,
  normalizeOptionalText,
  normalizeRequiredText,
  toDomainActorFallback,
} from './types';
import { PoolLedgerEntryKind, Prisma } from '@prisma/client';
import { errors } from '../../utils/errors';

export class PoolLedgerService {
  constructor(
    private prisma: DbClient,
    private domainEvents: DomainEventService,
  ) {}

  private get db(): any {
    return this.prisma as any;
  }

  async createPool(input: CreateLiquidityPoolInput, actor: Partial<DomainActor>) {
    const normalizedActor = toDomainActorFallback(actor);
    const slug = normalizeRequiredText(input.slug, 'slug');
    const name = normalizeRequiredText(input.name, 'name');
    const description = normalizeOptionalText(input.description, 'description');

    return this.db.$transaction(async (tx: DbClient) => {
      const existing = await (tx as any).liquidityPool.findUnique({
        where: { slug },
      });
      if (existing) {
        throw errors.conflict(`Liquidity pool slug ${slug} already exists`);
      }

      const pool = await (tx as any).liquidityPool.create({
        data: {
          slug,
          name,
          description,
          policyJson: input.policyJson,
          createdBy: normalizedActor.id,
        },
      });

      await (tx as any).ledgerAccount.createMany({
        data: DEFAULT_POOL_ACCOUNTS.map((account) => ({
          poolId: pool.id,
          code: account.code,
          name: account.name,
          accountType: account.accountType,
          currency: 'usd',
          isSystem: true,
        })),
      });

      await this.domainEvents.emitAndAudit(
        {
          aggregateType: 'liquidity_pool',
          aggregateId: pool.id,
          eventType: 'liquidity_pool.created',
          payload: {
            slug: pool.slug,
            name: pool.name,
          },
          actor: normalizedActor,
        },
        {
          entityType: 'liquidity_pool',
          entityId: pool.id,
          action: 'liquidity_pool_created',
          actor: normalizedActor,
          after: {
            slug: pool.slug,
            name: pool.name,
            systemAccountCount: DEFAULT_POOL_ACCOUNTS.length,
          },
        },
        tx,
      );

      return this.getPoolSnapshot(pool.id, tx);
    });
  }

  async listPools(limit: number = 12, db: DbClient = this.prisma) {
    const pools = await (db as any).liquidityPool.findMany({
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        ledgerAccounts: {
          orderBy: { code: 'asc' },
        },
      },
    });

    return Promise.all(
      pools.map(async (pool: any) => {
        const [availableBalanceCents, reservedBalanceCents] = await Promise.all([
          this.getTreasuryBalance(pool.id, db),
          this.getAccountBalance(pool.id, 'allocation-reserve', db),
        ]);

        return {
          ...pool,
          availableBalanceCents,
          reservedBalanceCents,
        };
      }),
    );
  }

  assertBalanced(lines: Array<{ amountCents: number }>) {
    const total = lines.reduce((sum, line) => sum + line.amountCents, 0);
    if (total !== 0) {
      throw errors.unprocessable('Ledger journal must balance to zero');
    }
    return true;
  }

  private async acquirePoolWriteLock(poolId: string, db: DbClient) {
    await (db as any).$queryRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtext('flora_fauna.pool')::integer, hashtext(${poolId})::integer)`,
    );
  }

  private async withPoolMutation<T>(
    poolId: string,
    db: DbClient,
    callback: (client: DbClient) => Promise<T>,
  ): Promise<T> {
    const execute = async (client: DbClient) => {
      await this.acquirePoolWriteLock(poolId, client);
      return callback(client);
    };

    if (db === this.prisma) {
      return this.db.$transaction(
        async (tx: DbClient) => execute(tx),
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    }

    return execute(db);
  }

  private async persistJournal(
    poolId: string,
    entryKind: PoolLedgerEntryKind,
    lines: JournalLineInput[],
    actor: Partial<DomainActor>,
    referenceType: string | undefined,
    referenceId: string | undefined,
    memo: string | undefined,
    client: DbClient,
  ) {
    if (!lines.length) {
      throw errors.badRequest('At least one journal line is required');
    }

    lines.forEach((line) => {
      if (!Number.isInteger(line.amountCents) || line.amountCents === 0) {
        throw errors.badRequest('Ledger journal lines must be non-zero integer cent amounts');
      }
    });
    this.assertBalanced(lines);

    const accountCodes = [...new Set(lines.map((line) => line.accountCode))];
    const accounts = await (client as any).ledgerAccount.findMany({
      where: {
        poolId,
        code: { in: accountCodes },
      },
    });
    if (accounts.length !== accountCodes.length) {
      throw errors.notFound('One or more ledger accounts were not found for the pool');
    }

    const accountByCode = new Map(accounts.map((account: any) => [account.code, account]));
    const normalizedActor = toDomainActorFallback(actor);
    const journalId = `journal_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const description = normalizeOptionalText(memo, 'memo') || JOURNAL_KIND_TO_MEMO[entryKind];

    const result = await (client as any).ledgerEntry.createMany({
      data: lines.map((line) => {
        const account = accountByCode.get(line.accountCode) as { id: string } | undefined;
        if (!account) {
          throw errors.notFound(`Ledger account ${line.accountCode} not found`);
        }

        return {
          journalId,
          poolId,
          accountId: account.id,
          entryKind,
          amountCents: line.amountCents,
          referenceType,
          referenceId,
          memo: description,
          createdBy: normalizedActor.id,
        };
      }),
    });

    if (result.count !== lines.length) {
      throw errors.internal('Failed to persist the full ledger journal');
    }

    await this.domainEvents.emitAndAudit(
      {
        aggregateType: 'liquidity_pool',
        aggregateId: poolId,
        eventType: 'ledger.journal_posted',
        payload: {
          journalId,
          entryKind,
          referenceType,
          referenceId,
          lines,
        },
        actor: normalizedActor,
      },
      {
        entityType: 'ledger_journal',
        entityId: journalId,
        action: 'ledger_journal_posted',
        actor: normalizedActor,
        after: {
          poolId,
          entryKind,
          referenceType,
          referenceId,
          lineCount: lines.length,
        },
      },
      client,
    );

    return { journalId };
  }

  async postJournal(
    poolId: string,
    entryKind: PoolLedgerEntryKind,
    lines: JournalLineInput[],
    actor: Partial<DomainActor>,
    referenceType?: string,
    referenceId?: string,
    memo?: string,
    db: DbClient = this.prisma,
  ) {
    return this.withPoolMutation(poolId, db, (client) =>
      this.persistJournal(poolId, entryKind, lines, actor, referenceType, referenceId, memo, client),
    );
  }

  async recordRevenueAllocation(
    poolId: string,
    amountCents: number,
    actor: Partial<DomainActor>,
    referenceType?: string,
    referenceId?: string,
    db: DbClient = this.prisma,
  ) {
    assertPositiveCents(amountCents, 'amountCents');
    return this.postJournal(
      poolId,
      PoolLedgerEntryKind.pool_allocation,
      [
        { accountCode: 'treasury', amountCents },
        { accountCode: 'revenue-clearing', amountCents: -amountCents },
      ],
      actor,
      referenceType,
      referenceId,
      `Pool allocation ${referenceType || 'revenue'}`,
      db,
    );
  }

  async reserveAllocation(
    poolId: string,
    amountCents: number,
    actor: Partial<DomainActor>,
    referenceId?: string,
    db: DbClient = this.prisma,
  ) {
    assertPositiveCents(amountCents, 'amountCents');
    return this.withPoolMutation(
      poolId,
      db,
      async (client) => {
        const treasuryBalance = await this.getTreasuryBalance(poolId, client);
        if (treasuryBalance < amountCents) {
          throw errors.unprocessable(
            `Allocation exceeds available liquidity. Required ${amountCents}, available ${treasuryBalance}`,
          );
        }

        const journal = await this.persistJournal(
          poolId,
          PoolLedgerEntryKind.allocation_reservation,
          [
            { accountCode: 'treasury', amountCents: -amountCents },
            { accountCode: 'allocation-reserve', amountCents },
          ],
          actor,
          'allocation_request',
          referenceId,
          'Allocation reservation',
          client,
        );

        return {
          ...journal,
          availableBalanceCents: treasuryBalance - amountCents,
        };
      },
    );
  }

  async releaseAllocationReservation(
    poolId: string,
    amountCents: number,
    actor: Partial<DomainActor>,
    referenceId?: string,
    db: DbClient = this.prisma,
  ) {
    assertPositiveCents(amountCents, 'amountCents');
    return this.withPoolMutation(
      poolId,
      db,
      async (client) => {
        const reservedBalance = await this.getAccountBalance(poolId, 'allocation-reserve', client);
        if (reservedBalance < amountCents) {
          throw errors.unprocessable(
            `Insufficient reserved balance. Required ${amountCents}, available ${reservedBalance}`,
          );
        }

        return this.persistJournal(
          poolId,
          PoolLedgerEntryKind.allocation_release,
          [
            { accountCode: 'allocation-reserve', amountCents: -amountCents },
            { accountCode: 'treasury', amountCents },
          ],
          actor,
          'allocation_request',
          referenceId,
          'Allocation reservation released',
          client,
        );
      },
    );
  }

  async recordDisbursement(
    poolId: string,
    amountCents: number,
    actor: Partial<DomainActor>,
    referenceId?: string,
    db: DbClient = this.prisma,
  ) {
    assertPositiveCents(amountCents, 'amountCents');
    return this.withPoolMutation(
      poolId,
      db,
      async (client) => {
        const reservedBalance = await this.getAccountBalance(poolId, 'allocation-reserve', client);
        if (reservedBalance < amountCents) {
          throw errors.unprocessable(
            `Insufficient reserved balance. Required ${amountCents}, available ${reservedBalance}`,
          );
        }

        return this.persistJournal(
          poolId,
          PoolLedgerEntryKind.disbursement,
          [
            { accountCode: 'allocation-reserve', amountCents: -amountCents },
            { accountCode: 'mutual-aid-disbursed', amountCents },
          ],
          actor,
          'disbursement',
          referenceId,
          'Mutual-aid disbursement',
          client,
        );
      },
    );
  }

  async getAccountBalance(poolId: string, accountCode: string, db: DbClient = this.prisma): Promise<number> {
    const account = await (db as any).ledgerAccount.findUnique({
      where: {
        poolId_code: {
          poolId,
          code: accountCode,
        },
      },
    });

    if (!account) {
      throw errors.notFound(`Ledger account ${accountCode} not found`);
    }

    const balance = await (db as any).ledgerEntry.aggregate({
      where: { accountId: account.id },
      _sum: { amountCents: true },
    });

    return balance._sum.amountCents || 0;
  }

  async getTreasuryBalance(poolId: string, db: DbClient = this.prisma): Promise<number> {
    return this.getAccountBalance(poolId, 'treasury', db);
  }

  async getPoolSnapshot(poolId: string, db: DbClient = this.prisma) {
    const pool = await (db as any).liquidityPool.findUnique({
      where: { id: poolId },
      include: {
        ledgerAccounts: {
          orderBy: { code: 'asc' },
        },
      },
    });

    if (!pool) {
      throw errors.notFound(`Liquidity pool ${poolId} not found`);
    }

    const [entries, balances] = await Promise.all([
      (db as any).ledgerEntry.findMany({
        where: { poolId },
        include: {
          account: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      Promise.all(
        pool.ledgerAccounts.map(async (account: any) => ({
          ...account,
          balanceCents: await this.getAccountBalance(poolId, account.code, db),
        })),
      ),
    ]);

    return {
      ...pool,
      availableBalanceCents: balances.find((account: any) => account.code === 'treasury')?.balanceCents ?? 0,
      reservedBalanceCents: balances.find((account: any) => account.code === 'allocation-reserve')?.balanceCents ?? 0,
      disbursedBalanceCents: balances.find((account: any) => account.code === 'mutual-aid-disbursed')?.balanceCents ?? 0,
      ledgerAccounts: balances,
      recentEntries: entries,
    };
  }
}

export default PoolLedgerService;
