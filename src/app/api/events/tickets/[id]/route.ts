import { NextResponse } from "next/server";
import { getTicketByCode, getTicketById } from "@/lib/tickets/store";
import { getCollection } from "@/lib/cms/store";
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

    // Enrich from live CMS event when snapshot fields missing (older tickets)
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
