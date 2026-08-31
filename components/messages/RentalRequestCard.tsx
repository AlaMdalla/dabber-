"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, ImageOff, Truck, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errorMessage";
import { durationDays } from "@/lib/rentalPricing";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { RentalRequest, RentalRequestStatus, RentalRequestWithItems } from "@/lib/supabase/types";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

interface RentalRequestCardProps {
  request: RentalRequestWithItems;
  currentUserId: string;
}

const STATUS_KEYS: Record<RentalRequestStatus, TranslationKey> = {
  pending: "calendar.pending",
  accepted: "reservations.confirmedLabel",
  rejected: "calendar.declined",
  cancelled: "calendar.cancelled",
  completed: "rentalRequest.statusCompleted",
};

const STATUS_CLASSES: Record<RentalRequestStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-slate-100 text-slate-700",
  completed: "bg-blue-100 text-blue-800",
};

function formatDate(isoDate: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

export default function RentalRequestCard({ request, currentUserId }: RentalRequestCardProps) {
  const { t, locale } = useI18n();
  const [current, setCurrent] = useState(request);
  const [isExpanded, setIsExpanded] = useState(request.rental_request_items.length <= 2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = currentUserId === current.owner_id;
  const isRenter = currentUserId === current.renter_id;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`rental-request-${request.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rental_requests", filter: `id=eq.${request.id}` },
        (payload) => {
          setCurrent((prev) => ({ ...prev, ...(payload.new as RentalRequest) }));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [request.id]);

  const total = current.status === "pending" ? current.estimated_total : (current.confirmed_total ?? current.estimated_total);
  const itemCount = current.rental_request_items.reduce((sum, item) => sum + item.quantity, 0);

  const earliestStart = current.rental_request_items.reduce<string | null>(
    (earliest, item) => (earliest === null || item.start_date < earliest ? item.start_date : earliest),
    null,
  );
  const canRenterCancel =
    isRenter &&
    (current.status === "pending" ||
      (current.status === "accepted" &&
        current.rental_request_items.every((item) => item.start_date >= addDaysIso(3))));

  async function runAction(rpcName: string, confirmMessage: string) {
    if (!window.confirm(confirmMessage)) return;
    setIsSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc(rpcName, { p_request_id: current.id });
    setIsSubmitting(false);
    if (rpcError) {
      console.error(`[RentalRequestCard] ${rpcName} failed:`, rpcError);
      setError(describeError(rpcError));
      return;
    }
    if (data) {
      setCurrent((prev) => ({ ...prev, ...data }));
    }
  }

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-border bg-subtle px-4 py-2.5">
        <p className="text-xs font-semibold text-ink">{t("rentalRequest.title")}</p>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_CLASSES[current.status]}`}>
          {t(STATUS_KEYS[current.status])}
        </span>
      </div>

      <div className="px-4 py-3">
        <p className="text-[11px] text-muted">
          {t("rentalRequest.reference", { reference: current.id.slice(0, 8).toUpperCase() })}
        </p>

        {!isExpanded ? (
          <p className="mt-2 text-sm text-ink">
            {t("rentalRequest.compactSummary", { count: itemCount, total: t("common.priceValue", { price: total ?? 0 }) })}
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2.5">
            {current.rental_request_items.map((item) => (
              <li key={item.id} className="flex gap-2.5">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-subtle text-muted">
                  {item.listing_image_url ? (
                    <Image src={item.listing_image_url} alt="" fill sizes="44px" className="object-cover" />
                  ) : (
                    <ImageOff className="h-4 w-4" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink">
                    {item.quantity} × {item.listing_title}
                  </p>
                  <p className="text-[11px] text-muted">
                    {formatDate(item.start_date, locale)} → {formatDate(item.end_date, locale)}
                    {" · "}
                    {t("cart.durationDays", { count: durationDays(item.start_date, item.end_date) })}
                  </p>
                  <p className="text-[11px] font-medium text-ink">
                    {item.subtotal !== null
                      ? t("common.priceValue", { price: item.subtotal })
                      : t("common.priceRequest")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {current.rental_request_items.length > 2 && (
          <button
            type="button"
            onClick={() => setIsExpanded((value) => !value)}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-ink underline decoration-border underline-offset-4"
          >
            {isExpanded ? t("rentalRequest.showLess") : t("rentalRequest.viewDetails")}
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1">
            {current.fulfillment_method === "delivery" ? (
              <Truck className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {current.fulfillment_method === "delivery" ? t("cart.delivery") : t("cart.pickup")}
          </span>
          {earliestStart && <span>{formatDate(earliestStart, locale)}</span>}
        </div>

        {current.renter_message && (
          <p className="mt-2 rounded-lg bg-subtle px-3 py-2 text-xs text-ink">
            “{current.renter_message}”
          </p>
        )}

        <p className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-sm">
          <span className="text-muted">{t("cart.estimatedTotal")}</span>
          <span className="font-bold text-ink">{t("common.priceValue", { price: total ?? 0 })}</span>
        </p>

        {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}

        {isOwner && current.status === "pending" && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => runAction("accept_rental_request", t("rentalRequest.confirmAccept"))}
              className="h-9 flex-1 rounded-lg bg-green-100 text-xs font-semibold text-green-800 transition-colors hover:bg-green-200 disabled:opacity-60"
            >
              {t("rentalRequest.accept")}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => runAction("reject_rental_request", t("rentalRequest.confirmReject"))}
              className="h-9 flex-1 rounded-lg bg-red-100 text-xs font-semibold text-red-800 transition-colors hover:bg-red-200 disabled:opacity-60"
            >
              {t("rentalRequest.reject")}
            </button>
          </div>
        )}

        {isOwner && current.status === "accepted" && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => runAction("complete_rental_request", t("rentalRequest.confirmComplete"))}
            className="mt-3 h-9 w-full rounded-lg bg-blue-100 text-xs font-semibold text-blue-800 transition-colors hover:bg-blue-200 disabled:opacity-60"
          >
            {t("rentalRequest.markCompleted")}
          </button>
        )}

        {canRenterCancel && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => runAction("cancel_rental_request", t("rentalRequest.confirmCancel"))}
            className="mt-3 h-9 w-full rounded-lg border border-red-200 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
          >
            {t("rentalRequest.cancel")}
          </button>
        )}
      </div>
    </div>
  );
}

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
