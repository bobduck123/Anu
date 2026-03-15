-- Backfill reservation accounts for existing pools after the memetics
-- foundation migration has created the tables and enum.

SET search_path TO public, falak;

DO $$
BEGIN
  IF to_regclass('public."ledger_accounts"') IS NULL
     OR to_regclass('public."liquidity_pools"') IS NULL
     OR to_regtype('public."LedgerAccountType"') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'LedgerAccountType'
      AND e.enumlabel = 'allocation_reserve'
  ) THEN
    RETURN;
  END IF;

  EXECUTE $sql$
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
    )
  $sql$;
END $$;
