import {
  LedgerEntryType,
  Wallet,
  WalletLedgerEntry,
  WalletOwnerType,
} from '@prisma/client';

/**
 * Balance bucket that a wallet operation may mutate.
 */
export type WalletBalanceField =
  | 'availableBalanceKobo'
  | 'escrowBalanceKobo'
  | 'pendingPayoutBalanceKobo';

/**
 * Input for creating a wallet with one concrete owner relation.
 */
export interface CreateWalletInput {
  ownerType: WalletOwnerType;
  buyerProfileId?: string;
  sellerProfileId?: string;
  platformEntityId?: string;
}

/**
 * Shared input for ledger-backed wallet credit and debit operations.
 */
export interface WalletMovementInput {
  walletId: string;
  amountKobo: bigint;
  entryType: LedgerEntryType;
  reference: string;
  idempotencyKey: string;
  balanceField?: WalletBalanceField;
  relatedOrderId?: string;
  relatedOrderItemId?: string;
  relatedEscrowId?: string;
  relatedPaymentId?: string;
  relatedPayoutRecordId?: string;
  narration?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result returned after a wallet movement.
 */
export interface WalletMovementResult {
  wallet: Wallet | null;
  ledgerEntry: WalletLedgerEntry;
  wasIdempotentReplay: boolean;
}
