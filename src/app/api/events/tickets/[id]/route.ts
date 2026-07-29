import { NextResponse } from "next/server";
import {
  getTicketByCode,
  getTicketById,
  revokeTicket,
} from "@/lib/tickets/store";
import { getCollection, upsertItem } from "@/lib/cms/store";
import { requireSuperAdminAny } from "@/lib/auth/local-users";
import { createNotification } from "@/lib/notifications/store";
import { logActivity } from "@/lib/activity/log";
import type { Event } from "@/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET ticket / e-receipt by id, ticketCode, or receiptId — enriched for official receipt */
export async function GET(_request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const ticket = getTicketById(id) || getTicketByCode(id);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    let eventLocation = ticket.eventLocation;
    let eventDistrict = ticket.eventDistrict;
    let eventStartDate = ticket.eventStartDate;
    let eventEndDate = ticket.eventEndDate;
    let eventType = ticket.eventType;
    let eventTitle = ticket.eventTitle;

    try {
      const events = (await getCollection("events")) as Event[];
      const ev =
        events.find((e) => e.id === ticket.eventId) ||
        events.find((e) => e.slug === ticket.eventSlug);
      if (ev) {
        eventTitle = eventTitle || ev.title;
        eventLocation = eventLocation || ev.location;
        eventDistrict = eventDistrict || ev.district;
        eventStartDate = eventStartDate || ev.startDate;
        eventEndDate = eventEndDate || ev.endDate;
        eventType = eventType || ev.type;
      }
    } catch {
      /* keep ticket snapshot */
    }

    return NextResponse.json({
      success: true,
      ticket: {
        ...ticket,
        eventTitle,
        eventLocation,
        eventDistrict,
        eventStartDate,
        eventEndDate,
        eventType,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}

/**
 * DELETE — Super Admin revokes attendance / cancels ticket (frees seats).
 * Does not automatically refund money.
 */
export async function DELETE(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const { searchParams } = new URL(request.url);
    const actorId =
      String(body.actorId || searchParams.get("actorId") || "") ||
      request.headers.get("x-actor-id") ||
      "";
    const actorEmail =
      String(body.actorEmail || searchParams.get("actorEmail") || "") ||
      request.headers.get("x-actor-email") ||
      "";

    if (!actorId && !actorEmail) {
      return NextResponse.json({ error: "Super admin required" }, { status: 401 });
    }
    requireSuperAdminAny(actorId, actorEmail);

    const existing = getTicketById(id) || getTicketByCode(id);
    if (!existing) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    if (existing.status === "cancelled") {
      return NextResponse.json({
        success: true,
        ticket: existing,
        message: "Ticket already cancelled",
      });
    }

    const reason = String(body.reason || "Revoked by super admin").slice(0, 300);
    const ticket = revokeTicket(existing.id, {
      reason,
      revokedBy: actorEmail || actorId,
    });
    if (!ticket) {
      return NextResponse.json({ error: "Could not revoke ticket" }, { status: 500 });
    }

    // Free seats on event registered count
    try {
      const events = (await getCollection("events")) as Event[];
      const ev =
        events.find((e) => e.id === ticket.eventId) ||
        events.find((e) => e.slug === ticket.eventSlug);
      if (ev) {
        const reg = Math.max(0, (Number(ev.registered) || 0) - (ticket.seats || 0));
        await upsertItem(
          "events",
          {
            ...ev,
            registered: reg,
            updatedAt: new Date().toISOString(),
          },
          actorEmail || "super-admin"
        );
      }
    } catch {
      /* non-blocking */
    }

    try {
      createNotification({
        sourceKey: `ticket-revoked:${ticket.id}`,
        audience: "user",
        userId: ticket.userId,
        userEmail: ticket.userEmail,
        type: "warning",
        title: "Event registration revoked",
        message: `Your ticket for ${ticket.eventTitle} (${ticket.ticketCode}) was cancelled by an administrator. ${reason}`,
        link: ticket.eventSlug ? `/events/${ticket.eventSlug}` : "/dashboard/events",
      });
    } catch {
      /* non-blocking */
    }

    logActivity({
      kind: "ticket",
      action: `Revoked ticket ${ticket.ticketCode} for ${ticket.userEmail} — ${ticket.eventTitle}`,
      actor: actorEmail || actorId,
      target: ticket.id,
      meta: { reason, seats: ticket.seats, eventId: ticket.eventId },
    });

    return NextResponse.json({
      success: true,
      ticket,
      message: `Revoked ${ticket.ticketCode}. Seats freed. Refund money separately if needed.`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Revoke failed";
    const status = /super admin/i.test(msg) ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
