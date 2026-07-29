/**
 * Super-admin withdrawal ledger (file-backed).
 * Tracks money sent from app balance → admin mobile money via PawaPay payouts.
 */

import { randomUUID } from "crypto";
import { join } from "path";
import {
  readJsonFile,
  writeWithBackup,
  initDurableStore,
} from "@/lib/persist/durable-json";

export type WithdrawalStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type Withdrawal = {
  id: string;
  /** PawaPay payoutId, refundId, or local id for manual */
  payoutId: string;
  amount: number;
  currency: string;
  /** mtn_momo | airtel_money | unknown */
  gateway: "mtn_momo" | "airtel_money" | "unknown";
  phone: string;
  msisdn: string;
  status: WithdrawalStatus;
  providerStatus?: string;
  failureReason?: string;
  actorId?: string;
  actorEmail?: string;
  actorName?: string;
  note?: string;
  live: boolean;
  /**
   * payout = PawaPay PAYOUT to admin phone
   * refund = money returned to original payer (deposit refund)
   * manual = recorded after cash-out outside the app (dashboard/settlement)
   */
  method?: "payout" | "refund" | "manual";
  /** For refund method: original deposit / payment ids */
  depositId?: string;
  paymentId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

type WithdrawalsDb = { withdrawals: Withdrawal[] };

const FILE = join(process.cwd(), "data", "withdrawals.json");

function ensureDb(): WithdrawalsDb {
  void initDurableStore();
  const parsed = readJsonFile<WithdrawalsDb>(FILE);
  if (parsed && Array.isArray(parsed.withdrawals)) return parsed;
  const empty: WithdrawalsDb = { withdrawals: [] };
  writeWithBackup(FILE, JSON.stringify(empty, null, 2));
  return empty;
}

function saveDb(db: WithdrawalsDb) {
  writeWithBackup(FILE, JSON.stringify(db, null, 2));
}

export function listWithdrawals(): Withdrawal[] {
  return ensureDb().withdrawals.slice().sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function getWithdrawal(idOrPayout: string): Withdrawal | undefined {
  return ensureDb().withdrawals.find(
    (w) => w.id === idOrPayout || w.payoutId === idOrPayout
  );
}

export function createWithdrawal(
  input: Omit<Withdrawal, "id" | "createdAt" | "updatedAt">
): Withdrawal {
  const db = ensureDb();
  const now = new Date().toISOString();
  const row: Withdrawal = {
    ...input,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  db.withdrawals.push(row);
  saveDb(db);
  return row;
}

export function updateWithdrawal(
  idOrPayout: string,
  patch: Partial<Withdrawal>
): Withdrawal | null {
  const db = ensureDb();
  const idx = db.withdrawals.findIndex(
    (w) => w.id === idOrPayout || w.payoutId === idOrPayout
  );
  if (idx < 0) return null;
  const now = new Date().toISOString();
  db.withdrawals[idx] = {
    ...db.withdrawals[idx],
    ...patch,
    id: db.withdrawals[idx].id,
    payoutId: patch.payoutId || db.withdrawals[idx].payoutId,
    updatedAt: now,
  };
  if (patch.status === "completed" && !db.withdrawals[idx].completedAt) {
    db.withdrawals[idx].completedAt = now;
  }
  saveDb(db);
  return db.withdrawals[idx];
}

/**
 * Amount reserved or already paid out (cannot withdraw again).
 * pending + processing + completed count against available balance.
 */
export function totalWithdrawnOrReserved(): number {
  return ensureDb().withdrawals.reduce((sum, w) => {
    if (w.status === "failed" || w.status === "cancelled") return sum;
    return sum + (Number(w.amount) || 0);
  }, 0);
}

export function completedWithdrawalsTotal(): number {
  return ensureDb().withdrawals.reduce((sum, w) => {
    if (w.status !== "completed") return sum;
    return sum + (Number(w.amount) || 0);
  }, 0);
}
