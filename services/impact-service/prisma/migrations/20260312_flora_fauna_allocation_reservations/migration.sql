-- Add reservation accounts and entry kinds for approval-time liquidity holds

ALTER TYPE "LedgerAccountType" ADD VALUE IF NOT EXISTS 'allocation_reserve';
ALTER TYPE "PoolLedgerEntryKind" ADD VALUE IF NOT EXISTS 'allocation_reservation';
ALTER TYPE "PoolLedgerEntryKind" ADD VALUE IF NOT EXISTS 'allocation_release';
