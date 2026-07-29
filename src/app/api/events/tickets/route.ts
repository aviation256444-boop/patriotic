import { NextResponse } from "next/server";
import { getCollection, upsertItem } from "@/lib/cms/store";
import {
  createConfirmedTicket,
  listTickets,
  paymentStats,
  seatsSoldForEvent,
} from "@/lib/tickets/store";
import type { Event } from "@/types";
import type { CmsDonation } from "@/lib/cms/types";
import { resolveEventPricing } from "@/lib/events/pricing";

export const dynamic = "force-dynamic";

/**
 * GET /api/events/tickets
 * ?stats=1 for revenue dashboard
 * ?eventId=... or ?userEmail=...
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("stats") === "1") {
      return NextResponse.json(
        { success: true, ...paymentStats() },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    let tickets = listTickets();
    const eventId = searchParams.get("eventId");
    const userEmail = searchParams.get("userEmail")?.toLowerCase();
    const userId = searchParams.get("userId");

    if (eventId) tickets = tickets.filter((t) => t.eventId === eventId);
    if (userEmail) tickets = tickets.filter((t) => t.userEmail.toLowerCase() === userEmail);
    if (userId) tickets = tickets.filter((t) => t.userId === userId);

    return NextResponse.json(
      { success: true, tickets, count: tickets.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/tickets
 * Issue a ticket ONLY for:
 *  - free events, or
 *  - paid events after paymentId is confirmed completed in donations store
 *
 * Never issues a ticket for unpaid / pending charges.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const eventId = String(body.eventId || "");
    const eventSlug = String(body.eventSlug || "");
    const seats = Math.max(1, Math.min(20, Math.round(Number(body.seats) || 1)));
    const userName = String(body.userName || body.donorName || "Guest").trim();
    const userEmail = String(body.userEmail || body.email || "").trim().toLowerCase();
    const userPhone = body.userPhone || body.phone ? String(body.userPhone || body.phone) : undefined;
    const userId = body.userId ? String(body.userId) : undefined;
    const paymentId = body.paymentId ? String(body.paymentId) : "";
    const paymentExternalId = body.paymentExternalId || body.externalId
      ? String(body.paymentExternalId || body.externalId)
      : undefined;

    if (!eventId && !eventSlug) {
      return NextResponse.json({ error: "eventId or eventSlug required" }, { status: 400 });
    }
    if (!userEmail) {
      return NextResponse.json({ error: "Email required for ticket" }, { status: 400 });
    }

    const events = (await getCollection("events")) as Event[];
    const event =
      events.find((e) => e.id === eventId) ||
      events.find((e) => e.slug === eventSlug);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.status === "past" || event.status === "cancelled") {
      return NextResponse.json({ error: "This event is not open for booking" }, { status: 400 });
    }

    const sold = seatsSoldForEvent(event.id);
    const capacity = Number(event.capacity) || 0;
    const remaining = Math.max(0, capacity - sold);
    if (capacity > 0 && remaining < seats) {
      return NextResponse.json(
        {
          error: `Only ${remaining} seat(s) left for this event`,
          remaining,
        },
        { status: 409 }
      );
    }

    // Price > 0 always paid — same rule as public event page
    const { isFree, unitPrice } = resolveEventPricing(event);
    const expectedAmount = unitPrice * seats;

    let paymentMethod = isFree ? "free" : String(body.paymentMethod || body.gateway || "unknown");
    let amountPaid = 0;

    if (isFree) {
      amountPaid = 0;
    } else {
      // Paid ticket: payment must already be completed
      if (!paymentId && !paymentExternalId) {
        return NextResponse.json(
          {
            error:
              "Payment not confirmed yet. Complete payment first — tickets are only issued after successful payment.",
            code: "PAYMENT_REQUIRED",
          },
          { status: 402 }
        );
      }

      const donations = (await getCollection("donations")) as Array<
        CmsDonation & {
          status?: string;
          amount?: number;
          paymentMethod?: string;
          externalId?: string;
          purpose?: string;
          liveCharge?: boolean;
        }
      >;

      const payment =
        donations.find((d) => d.id === paymentId) ||
        donations.find((d) => d.externalId === paymentExternalId);

      if (!payment) {
        return NextResponse.json(
          {
            error: "Payment record not found. Complete checkout first.",
            code: "PAYMENT_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      if (String(payment.status).toLowerCase() !== "completed") {
        return NextResponse.json(
          {
            error: `Payment status is "${payment.status}". Tickets are only issued after payment is confirmed.`,
            code: "PAYMENT_NOT_COMPLETED",
            paymentStatus: payment.status,
          },
          { status: 402 }
        );
      }

      amountPaid = Number(payment.amount) || expectedAmount;
      paymentMethod = String(payment.paymentMethod || paymentMethod);
    }

    const ticket = createConfirmedTicket({
      eventId: event.id,
      eventSlug: event.slug,
      eventTitle: event.title,
      eventLocation: event.location,
      eventDistrict: event.district,
      eventStartDate: event.startDate,
      eventEndDate: event.endDate,
      eventType: event.type,
      userId,
      userName,
      userEmail,
      userPhone,
      seats,
      amountPaid,
      currency: "UGX",
      paymentMethod,
      paymentId: paymentId || undefined,
      paymentExternalId,
    });

    // Update registered count on event
    const newRegistered = sold + seats;
    await upsertItem(
      "events",
      {
        ...event,
        registered: newRegistered,
        updatedAt: new Date().toISOString(),
      },
      "event-ticket-api"
    );

    try {
      const { createNotification } = await import("@/lib/notifications/store");
      createNotification({
        sourceKey: `ticket-issued:${ticket.id}`,
        audience: "user",
        userId: userId || undefined,
        userEmail,
        type: "event",
        title: isFree ? "Event registration confirmed" : "Event payment & ticket confirmed",
        message: `${event.title} · ${seats} seat(s) · Ticket ${ticket.ticketCode}. Open your e-ticket for the QR code.`,
        link: `/tickets/${ticket.id}`,
        meta: { ticketId: ticket.id, amountPaid, paymentMethod },
      });
    } catch {
      /* non-blocking */
    }

    return NextResponse.json({
      success: true,
      ticket,
      receipt: {
        receiptId: ticket.receiptId,
        ticketCode: ticket.ticketCode,
        amountPaid: ticket.amountPaid,
        currency: ticket.currency,
        seats: ticket.seats,
        eventTitle: ticket.eventTitle,
        paidAt: ticket.paidAt,
      },
      message: "Ticket issued after confirmed registration/payment",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ticket issue failed" },
      { status: 500 }
    );
  }
}
