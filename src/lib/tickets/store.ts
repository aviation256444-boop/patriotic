/**
 * Event tickets & e-receipts — file-backed store.
 * Tickets are only written after free registration or confirmed payment.
 */

import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { join } from "path";

export type TicketStatus = "confirmed" | "cancelled" | "used";

export type EventTicket = {
  id: string;
  /** Unique public receipt / ticket code shown to user & QR */
  ticketCode: string;
  /** Unique e-receipt id */
  receiptId: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  userId?: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  seats: number;
  amountPaid: number;
  currency: string;
  /** free | mtn_momo | airtel_money | card | bank */
  paymentMethod: string;
  paymentId?: string;
  paymentExternalId?: string;
  status: TicketStatus;
  paidAt: string;
  createdAt: string;
  updatedAt: string;
  checkedInAt?: string;
};

type TicketsDb = { tickets: EventTicket[] };

const DATA_DIR = join(process.cwd(), "data");
const FILE = join(DATA_DIR, "tickets.json");

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

function ensureDb(): TicketsDb {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(FILE)) {
    const empty: TicketsDb = { tickets: [] };
    writeAtomic(FILE, JSON.stringify(empty, null, 2));
    return empty;
  }
  try {
    const parsed = JSON.parse(readFileSync(FILE, "utf8")) as TicketsDb;
    if (!Array.isArray(parsed.tickets)) return { tickets: [] };
    return parsed;
  } catch {
    return { tickets: [] };
  }
}

function saveDb(db: TicketsDb) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeAtomic(FILE, JSON.stringify(db, null, 2));
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
    .reduce((sum, t) => sum + (t.seats || 1), 0);
}

export function createConfirmedTicket(input: {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  userId?: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  seats: number;
  amountPaid: number;
  currency?: string;
  paymentMethod: string;
  paymentId?: string;
  paymentExternalId?: string;
}): EventTicket {
  const seats = Math.max(1, Math.round(Number(input.seats) || 1));
  const now = new Date().toISOString();
  const id = randomUUID();
  const ticketCode = `TKT-${codePart(4)}-${codePart(6)}`;
  const receiptId = `RCPT-${Date.now().toString(36).toUpperCase()}-${codePart(4)}`;

  const ticket: EventTicket = {
    id,
    ticketCode,
    receiptId,
    eventId: input.eventId,
    eventSlug: input.eventSlug,
    eventTitle: input.eventTitle,
    userId: input.userId,
    userName: input.userName,
    userEmail: input.userEmail,
    userPhone: input.userPhone,
    seats,
    amountPaid: Math.max(0, Number(input.amountPaid) || 0),
    currency: (input.currency || "UGX").toUpperCase(),
    paymentMethod: input.paymentMethod,
    paymentId: input.paymentId,
    paymentExternalId: input.paymentExternalId,
    status: "confirmed",
    paidAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const db = ensureDb();
  // prevent duplicate ticket for same paid paymentId
  if (input.paymentId) {
    const existing = db.tickets.find(
      (t) => t.paymentId === input.paymentId && t.status === "confirmed"
    );
    if (existing) return existing;
  }

  db.tickets.unshift(ticket);
  saveDb(db);
  return ticket;
}

export function paymentStats() {
  const tickets = ensureDb().tickets.filter((t) => t.status === "confirmed");
  const totalRevenue = tickets.reduce((s, t) => s + (t.amountPaid || 0), 0);
  const totalSeats = tickets.reduce((s, t) => s + (t.seats || 0), 0);
  const byEvent: Record<
    string,
    { eventId: string; eventTitle: string; seats: number; revenue: number; tickets: number }
  > = {};
  const byGateway: Record<string, number> = {};

  for (const t of tickets) {
    if (!byEvent[t.eventId]) {
      byEvent[t.eventId] = {
        eventId: t.eventId,
        eventTitle: t.eventTitle,
        seats: 0,
        revenue: 0,
        tickets: 0,
      };
    }
    byEvent[t.eventId].seats += t.seats;
    byEvent[t.eventId].revenue += t.amountPaid;
    byEvent[t.eventId].tickets += 1;
    byGateway[t.paymentMethod] = (byGateway[t.paymentMethod] || 0) + t.amountPaid;
  }

  return {
    totalRevenue,
    totalSeats,
    totalTickets: tickets.length,
    byEvent: Object.values(byEvent),
    byGateway,
    recent: tickets.slice(0, 50),
  };
}
