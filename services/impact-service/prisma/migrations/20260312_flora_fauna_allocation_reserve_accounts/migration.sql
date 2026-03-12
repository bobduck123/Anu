-- Backfill reservation accounts for existing pools after enum values exist

INSERT INTO "ledger_accounts" (
  "id",
  "poolId",
  "code",
  "name",
  "accountType",
  "currency",
  "isSystem",
  "createdAt"
)
SELECT
  'acct_' || substr(md5(lp."id" || ':allocation-reserve'), 1, 24),
  lp."id",
  'allocation-reserve',
  'Allocation Reserve',
  'allocation_reserve'::"LedgerAccountType",
  'usd',
  true,
  CURRENT_TIMESTAMP
FROM "liquidity_pools" lp
WHERE NOT EXISTS (
  SELECT 1
  FROM "ledger_accounts" la
  WHERE la."poolId" = lp."id"
    AND la."code" = 'allocation-reserve'
);
