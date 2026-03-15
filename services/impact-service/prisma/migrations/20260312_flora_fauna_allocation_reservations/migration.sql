-- Add reservation accounts and entry kinds for approval-time liquidity holds.
-- This migration sorts before the memetics foundation migration that first
-- creates these enums, so on clean replay it must be a no-op until the types
-- already exist.

SET search_path TO public, falak;

DO $$
BEGIN
  IF to_regtype('public."LedgerAccountType"') IS NOT NULL THEN
    EXECUTE 'ALTER TYPE "LedgerAccountType" ADD VALUE IF NOT EXISTS ''allocation_reserve''';
  END IF;

  IF to_regtype('public."PoolLedgerEntryKind"') IS NOT NULL THEN
    EXECUTE 'ALTER TYPE "PoolLedgerEntryKind" ADD VALUE IF NOT EXISTS ''allocation_reservation''';
    EXECUTE 'ALTER TYPE "PoolLedgerEntryKind" ADD VALUE IF NOT EXISTS ''allocation_release''';
  END IF;
END $$;
