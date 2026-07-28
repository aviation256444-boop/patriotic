/**
 * Resolve whether an event is free or paid.
 *
 * Rule: any positive price means PAID (payment options must show),
 * even if the admin left the "Free Event" checkbox checked by mistake.
 * That was the main bug for admin-created events.
 */

export type EventPricingInput = {
  isFree?: boolean | string | number | null;
  price?: number | string | null;
};

export type EventPricing = {
  isFree: boolean;
  unitPrice: number;
};

export function resolveEventPricing(event: EventPricingInput | null | undefined): EventPricing {
  const raw = Number(event?.price);
  const unitPrice = Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 0;

  if (unitPrice > 0) {
    return { isFree: false, unitPrice };
  }

  return { isFree: true, unitPrice: 0 };
}

/** Format price badge for lists */
export function eventPriceLabel(event: EventPricingInput | null | undefined): string {
  const { isFree, unitPrice } = resolveEventPricing(event);
  if (isFree) return "Free";
  return `UGX ${unitPrice.toLocaleString()}`;
}

export function normalizeEventPayload<T extends Record<string, unknown>>(payload: T): T {
  const next = { ...payload } as Record<string, unknown>;
  const price = Math.max(0, Math.round(Number(next.price) || 0));
  const capacity = Math.max(0, Math.round(Number(next.capacity) || 0));
  const registered = Math.max(0, Math.round(Number(next.registered) || 0));

  next.price = price;
  next.capacity = capacity || 100;
  next.registered = registered;

  if (price > 0) {
    next.isFree = false;
  } else {
    // No price → free event
    next.isFree = true;
    next.price = 0;
  }

  // Ensure status has a valid default
  if (!next.status) next.status = "upcoming";
  if (!next.type) next.type = "physical";

  // Slug cleanup
  if (typeof next.slug === "string") {
    next.slug = next.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  return next as T;
}
