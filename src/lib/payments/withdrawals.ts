/**
 * Super-admin withdrawal ledger (file-backed).
 * Tracks money sent from app balance → admin mobile money via PawaPay payouts.
 */

import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { join } from "path";

export type WithdrawalStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type Withdrawal = {
  id: string;
  payoutId: string;
  amount: number;
  currency: string;
  /** mtn_momo | airtel_money */
  gateway: "mtn_momo" | "airtel_money";
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
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

type WithdrawalsDb = { withdrawals: Withdrawal[] };

const DATA_DIR = join(process.cwd(), "data");
const FILE = join(DATA_DIR, "withdrawals.json");

function writeAtomic(path: string, content: string) {
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, content, "utf8");
  try {
    renameSync(tmp, path);
  } catch {
    writeFileSync(path, content, "utf8");
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("fs").unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

function ensureDb(): WithdrawalsDb {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(FILE)) {
    const empty: WithdrawalsDb = { withdrawals: [] };
    writeAtomic(FILE, JSON.stringify(empty, null, 2));
    return empty;
  }
  try {
    const parsed = JSON.parse(readFileSync(FILE, "utf8")) as WithdrawalsDb;
    if (!Array.isArray(parsed.withdrawals)) return { withdrawals: [] };
    return parsed;
  } catch {
    return { withdrawals: [] };
  }
}

function saveDb(db: WithdrawalsDb) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeAtomic(FILE, JSON.stringify(db, null, 2));
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
