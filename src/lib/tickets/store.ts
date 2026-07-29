/**
 * Event tickets & e-receipts — durable store (Postgres when DATABASE_URL set).
 * Tickets are only written after free registration or confirmed payment.
 */

import { randomUUID } from "crypto";
import { join } from "path";
import {
  readJsonFile,
  writeWithBackup,
  initDurableStore,
} from "@/lib/persist/durable-json";
import { STORE_KEYS } from "@/lib/db/kv-store";

export type TicketStatus = "confirmed" | "cancelled" | "used";

export type EventTicket = {
  id: string;
  ticketCode: string;
  receiptId: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  /** Snapshot for one-page receipt even if CMS event changes */
  eventLocation?: string;
  eventDistrict?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  eventType?: string;
  userId?: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  seats: number;
  amountPaid: number;
  currency: string;
  paymentMethod: string;
  paymentId?: string;
  paymentExternalId?: string;
  status: TicketStatus;
  paidAt: string;
  createdAt: string;
  updatedAt: string;
  checkedInAt?: string;
  revokeReason?: string;
  revokedAt?: string;
  revokedBy?: string;
};

type TicketsDb = { tickets: EventTicket[] };

const FILE = join(process.cwd(), "data", "tickets.json");

function ensureDb(): TicketsDb {
  void initDurableStore();
  const parsed = readJsonFile<TicketsDb>(FILE);
  if (parsed && Array.isArray(parsed.tickets)) return parsed;
  const empty: TicketsDb = { tickets: [] };
  writeWithBackup(FILE, JSON.stringify(empty, null, 2));
  return empty;
}

function saveDb(db: TicketsDb) {
  writeWithBackup(FILE, JSON.stringify(db, null, 2));
  // key alias for clarity in Postgres
  void STORE_KEYS.tickets;
}

function codePart(n = 6) {
  return Math.random().toString(36).slice(2, 2 + n).toUpperCase();
}

export function listTickets(): EventTicket[] {
  return ensureDb().tickets.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getTicketById(id: string): EventTicket | null {
  return ensureDb().tickets.find((t) => t.id === id) || null;
}

export function getTicketByCode(code: string): EventTicket | null {
  const c = code.trim().toUpperCase();
  return (
    ensureDb().tickets.find(
      (t) =>
        t.ticketCode.toUpperCase() === c ||
        t.receiptId.toUpperCase() === c ||
        t.id === code
    ) || null
  );
}

export function seatsSoldForEvent(eventId: string): number {
  return ensureDb()
    .tickets.filter((t) => t.eventId === eventId && t.status === "confirmed")
    .reduce((s, t) => s + (t.seats || 0), 0);
}

export function createConfirmedTicket(input: {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  eventLocation?: string;
  eventDistrict?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  eventType?: string;
  userId?: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  seats: number;
  amountPaid: number;
  currency: string;
  paymentMethod: string;
  paymentId?: string;
  paymentExternalId?: string;
}): EventTicket {
  const db = ensureDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  const ticket: EventTicket = {
    id,
    ticketCode: `TKT-${codePart(4)}-${codePart(4)}`,
    receiptId: `RCP-${Date.now().toString(36).toUpperCase()}-${codePart(4)}`,
    eventId: input.eventId,
    eventSlug: input.eventSlug,
    eventTitle: input.eventTitle,
    eventLocation: input.eventLocation,
    eventDistrict: input.eventDistrict,
    eventStartDate: input.eventStartDate,
    eventEndDate: input.eventEndDate,
    eventType: input.eventType,
    userId: input.userId,
    userName: input.userName,
    userEmail: input.userEmail.toLowerCase(),
    userPhone: input.userPhone,
    seats: input.seats,
    amountPaid: input.amountPaid,
    currency: input.currency,
    paymentMethod: input.paymentMethod,
    paymentId: input.paymentId,
    paymentExternalId: input.paymentExternalId,
    status: "confirmed",
    paidAt: now,
    createdAt: now,
    updatedAt: now,
  };
  db.tickets.push(ticket);
  saveDb(db);
  return ticket;
}

/**
 * Super admin revoke: mark ticket cancelled (seats free for inventory).
 * Does not auto-refund money — use payments refund separately.
 */
export function revokeTicket(
  ticketId: string,
  opts?: { reason?: string; revokedBy?: string }
): EventTicket | null {
  const db = ensureDb();
  const idx = db.tickets.findIndex(
    (t) =>
      t.id === ticketId ||
      t.ticketCode === ticketId ||
      t.receiptId === ticketId
  );
  if (idx < 0) return null;
  const t = db.tickets[idx];
  if (t.status === "cancelled") return t;
  const now = new Date().toISOString();
  db.tickets[idx] = {
    ...t,
    status: "cancelled",
    updatedAt: now,
    revokeReason: opts?.reason || "Revoked by super admin",
    revokedAt: now,
    revokedBy: opts?.revokedBy,
  };
  saveDb(db);
  return db.tickets[idx];
}

export function paymentStats() {
  const tickets = listTickets().filter((t) => t.status === "confirmed");
  const totalRevenue = tickets.reduce((s, t) => s + (Number(t.amountPaid) || 0), 0);
  const totalSeats = tickets.reduce((s, t) => s + (t.seats || 0), 0);
  const byEventMap = new Map<
    string,
    { eventId: string; eventTitle: string; seats: number; revenue: number; tickets: number }
  >();
  const byGateway: Record<string, number> = {};
  for (const t of tickets) {
    const cur = byEventMap.get(t.eventId) || {
      eventId: t.eventId,
      eventTitle: t.eventTitle,
      seats: 0,
      revenue: 0,
      tickets: 0,
    };
    cur.seats += t.seats || 0;
    cur.revenue += Number(t.amountPaid) || 0;
    cur.tickets += 1;
    byEventMap.set(t.eventId, cur);
    const g = t.paymentMethod || "unknown";
    byGateway[g] = (byGateway[g] || 0) + (Number(t.amountPaid) || 0);
  }
  return {
    totalRevenue,
    totalSeats,
    totalTickets: tickets.length,
    byEvent: Array.from(byEventMap.values()),
    byGateway,
    recent: tickets.slice(0, 40),
  };
}
