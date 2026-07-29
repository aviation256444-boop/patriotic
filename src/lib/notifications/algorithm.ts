/**
 * Personal notification feed algorithm.
 * Combines stored notifications + live signals (tickets, membership, upcoming events).
 */

import {
  createNotification,
  listAllNotifications,
  isNotificationForUser,
  isReadBy,
  type AppNotification,
} from "./store";
import { listTickets } from "@/lib/tickets/store";
import { formatDate } from "@/lib/utils";

export type FeedItem = AppNotification & {
  read: boolean;
  /** How this item was produced */
  origin: "stored" | "derived";
};

function hoursUntil(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return (t - Date.now()) / (1000 * 60 * 60);
}

/**
 * Ensure algorithmic notifications exist for this user (idempotent via sourceKey).
 * Call before listing feed.
 */
export function syncDerivedNotifications(user: {
  id: string;
  email: string;
  fullName?: string;
  membershipStatus?: string;
  membershipNumber?: string;
  role?: string;
  createdAt?: string;
}): void {
  const email = user.email.toLowerCase();
  const first = (user.fullName || "Member").split(" ")[0];

  // Welcome — once per account
  createNotification({
    sourceKey: `welcome:${user.id}`,
    audience: "user",
    userId: user.id,
    userEmail: email,
    type: "system",
    title: `Welcome to PYU, ${first}!`,
    message:
      "Your account is active. Complete your profile, join the WhatsApp group, and explore events and programs.",
    link: "/dashboard",
  });

  // Membership status signals
  const status = String(user.membershipStatus || "").toLowerCase();
  if (user.membershipNumber) {
    createNotification({
      sourceKey: `membership-number:${user.id}:${user.membershipNumber}`,
      audience: "user",
      userId: user.id,
      userEmail: email,
      type: "membership",
      title: "Membership number ready",
      message: `Your membership number is ${user.membershipNumber}. Open your digital card anytime.`,
      link: "/dashboard/membership",
    });
  } else if (status === "pending") {
    createNotification({
      sourceKey: `membership-pending:${user.id}`,
      audience: "user",
      userId: user.id,
      userEmail: email,
      type: "membership",
      title: "Membership under review",
      message:
        "Your membership application is pending. Finish your profile so admins can approve you faster.",
      link: "/membership",
    });
  }

  // Tickets → confirmations + reminders
  const tickets = listTickets().filter(
    (t) =>
      t.status === "confirmed" &&
      ((t.userId && t.userId === user.id) ||
        (t.userEmail && t.userEmail.toLowerCase() === email))
  );

  for (const t of tickets) {
    createNotification({
      sourceKey: `ticket-issued:${t.id}`,
      audience: "user",
      userId: user.id,
      userEmail: email,
      type: "event",
      title: "Event registration confirmed",
      message: `${t.eventTitle} · ${t.seats} seat(s) · Ticket ${t.ticketCode}. Open your e-ticket for the QR code.`,
      link: `/tickets/${t.id}`,
      meta: { ticketId: t.id, eventSlug: t.eventSlug },
    });

    const h = hoursUntil(t.eventStartDate);
    if (h != null && h > 0 && h <= 24 * 7) {
      const when = t.eventStartDate
        ? formatDate(t.eventStartDate, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "soon";
      const bucket =
        h <= 24 ? "24h" : h <= 72 ? "72h" : "7d";
      createNotification({
        sourceKey: `ticket-reminder:${t.id}:${bucket}`,
        audience: "user",
        userId: user.id,
        userEmail: email,
        type: "event",
        title:
          h <= 24
            ? "Event starts within 24 hours"
            : h <= 72
              ? "Event coming up this week"
              : "Upcoming event reminder",
        message: `${t.eventTitle} is scheduled for ${when}. Have your QR ticket ready.`,
        link: `/tickets/${t.id}`,
        meta: { ticketId: t.id, hoursUntil: Math.round(h) },
      });
    }
  }
}

export function buildNotificationFeed(input: {
  userId: string;
  userEmail: string;
  fullName?: string;
  membershipStatus?: string;
  membershipNumber?: string;
  role?: string;
  createdAt?: string;
  limit?: number;
}): {
  items: FeedItem[];
  unread: number;
  total: number;
} {
  syncDerivedNotifications({
    id: input.userId,
    email: input.userEmail,
    fullName: input.fullName,
    membershipStatus: input.membershipStatus,
    membershipNumber: input.membershipNumber,
    role: input.role,
    createdAt: input.createdAt,
  });

  const all = listAllNotifications().filter((n) =>
    isNotificationForUser(n, input.userId, input.userEmail, input.role)
  );

  const items: FeedItem[] = all
    .map((n) => ({
      ...n,
      read: isReadBy(n, input.userId, input.userEmail),
      origin: (n.sourceKey?.startsWith("ticket-reminder:") ||
      n.sourceKey?.startsWith("welcome:")
        ? "derived"
        : "stored") as FeedItem["origin"],
    }))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const limit = Math.max(1, Math.min(200, input.limit || 50));
  const sliced = items.slice(0, limit);
  const unread = items.filter((i) => !i.read).length;

  return { items: sliced, unread, total: items.length };
}
