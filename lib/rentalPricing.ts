// Client-side preview only, used consistently by every cart/checkout display
// so duration/subtotal never drifts between components. The server RPC
// (submit_rental_request) recomputes these authoritatively and is the only
// value that is ever actually persisted or charged.

/** Whole days in an inclusive date range, matching the calendar's existing `[]` semantics. */
export function durationDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  const days = Math.round((end - start) / 86_400_000) + 1;
  return Math.max(1, days);
}

export function itemSubtotal(
  unitPrice: number | null,
  quantity: number,
  startDate: string,
  endDate: string,
): number | null {
  if (unitPrice === null) return null;
  return unitPrice * quantity * durationDays(startDate, endDate);
}
