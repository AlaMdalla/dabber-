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

export interface RateOptions {
  perDay: number | null;
  perWeek: number | null;
  perMonth: number | null;
}

/**
 * Cheapest total across whichever of the three rates is configured, rounding
 * the requested duration UP to the next whole week/month (a partial
 * week/month bills as a full one — standard equipment-rental practice).
 * Mirrored exactly by best_rate_total() in the submit_rental_request RPC so
 * this preview and the persisted snapshot never diverge.
 */
export function bestRateTotal(rates: RateOptions, days: number): number | null {
  const candidates: number[] = [];
  if (rates.perDay !== null) candidates.push(rates.perDay * days);
  if (rates.perWeek !== null) candidates.push(rates.perWeek * Math.ceil(days / 7));
  if (rates.perMonth !== null) candidates.push(rates.perMonth * Math.ceil(days / 30));
  return candidates.length > 0 ? Math.min(...candidates) : null;
}

export function itemSubtotal(
  rates: RateOptions,
  quantity: number,
  startDate: string,
  endDate: string,
): number | null {
  const total = bestRateTotal(rates, durationDays(startDate, endDate));
  return total === null ? null : total * quantity;
}
