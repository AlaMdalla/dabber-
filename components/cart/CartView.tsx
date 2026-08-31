"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "@/components/i18n/LocalizedLink";
import { AlertTriangle, ImageOff, ShoppingBag, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errorMessage";
import {
  clearCart,
  getCartSnapshot,
  getServerCartSnapshot,
  removeCartItem,
  setCartDetails,
  subscribeCart,
  updateCartItem,
} from "@/lib/cart";
import { durationDays, itemSubtotal } from "@/lib/rentalPricing";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { localizePath } from "@/lib/i18n/config";
import type { FulfillmentMethod } from "@/lib/supabase/types";

interface LiveListing {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  price_per_day: number | null;
  available_quantity: number;
}

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function CartView() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const cart = useSyncExternalStore(subscribeCart, getCartSnapshot, getServerCartSnapshot);
  const [liveListings, setLiveListings] = useState<Record<string, LiveListing>>({});
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listingIds = cart.items.map((item) => item.listingId).sort().join(",");

  useEffect(() => {
    // An empty cart renders the early-return empty state below, which never
    // reads isLoadingAvailability -- nothing to synchronize in that case.
    if (cart.items.length === 0) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("listings")
      .select("id, name, slug, image_url, price_per_day, available_quantity")
      .in("id", cart.items.map((item) => item.listingId))
      .returns<LiveListing[]>()
      .then(({ data }) => {
        if (cancelled) return;
        const byId: Record<string, LiveListing> = {};
        for (const listing of data ?? []) byId[listing.id] = listing;
        setLiveListings(byId);
        setIsLoadingAvailability(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingIds]);

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
        <ShoppingBag className="h-10 w-10 text-muted" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-bold text-ink">{t("cart.emptyTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("cart.emptyDescription")}</p>
        <Link
          href="/listings"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-ink hover:bg-accent-hover"
        >
          {t("reservations.explore")}
        </Link>
      </div>
    );
  }

  const rows = cart.items.map((item) => {
    const live = liveListings[item.listingId];
    const unitPrice = live ? live.price_per_day : item.unitPrice;
    const availableQuantity = live ? live.available_quantity : item.availableQuantity;
    const subtotal = itemSubtotal(unitPrice, item.quantity, item.startDate, item.endDate);
    const isMissingListing = !isLoadingAvailability && live === undefined;
    const isOverstocked = !isLoadingAvailability && !isMissingListing && item.quantity > availableQuantity;
    return { item, live, unitPrice, availableQuantity, subtotal, isOverstocked, isMissingListing };
  });

  const estimatedTotal = rows.reduce((sum, row) => sum + (row.subtotal ?? 0), 0);
  const hasBlockingIssue = rows.some((row) => row.isOverstocked || row.isMissingListing);
  const needsDeliveryAddress =
    cart.fulfillmentMethod === "delivery" && cart.deliveryAddress.trim().length === 0;

  async function handleSubmit() {
    if (hasBlockingIssue || needsDeliveryAddress || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const payload = {
      p_owner_id: cart.ownerId,
      p_items: cart.items.map((item) => ({
        listing_id: item.listingId,
        quantity: item.quantity,
        start_date: item.startDate,
        end_date: item.endDate,
      })),
      p_message: cart.message.trim() || null,
      p_fulfillment_method: cart.fulfillmentMethod,
      p_delivery_address: cart.fulfillmentMethod === "delivery" ? cart.deliveryAddress.trim() : null,
      p_idempotency_key: cart.idempotencyKey,
    };

    const { data: requestId, error: submitError } = await supabase.rpc(
      "submit_rental_request",
      payload,
    );

    if (submitError || !requestId) {
      console.error("[CartView] submit failed:", submitError);
      setError(describeError(submitError));
      setIsSubmitting(false);
      return;
    }

    const { data: request } = await supabase
      .from("rental_requests")
      .select("conversation_id")
      .eq("id", requestId)
      .single<{ conversation_id: string }>();

    clearCart();
    router.push(localizePath(request ? `/messages/${request.conversation_id}` : "/messages", locale));
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink">{t("cart.pageTitle")}</h1>
      <p className="mt-2 text-sm text-muted">
        {t("cart.pageDescription", { name: cart.ownerName ?? "" })}
      </p>

      <ul className="mt-6 flex flex-col gap-4">
        {rows.map(({ item, unitPrice, availableQuantity, subtotal, isOverstocked, isMissingListing }) => (
          <li
            key={`${item.listingId}-${item.startDate}-${item.endDate}`}
            className="rounded-2xl border border-border bg-white p-4"
          >
            <div className="flex gap-4">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-subtle text-muted">
                {item.listingImageUrl ? (
                  <Image src={item.listingImageUrl} alt="" fill sizes="64px" className="object-cover" />
                ) : (
                  <ImageOff className="h-5 w-5" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/listings/${item.listingSlug}`}
                    className="text-sm font-semibold text-ink hover:underline"
                  >
                    {item.listingName}
                  </Link>
                  <button
                    type="button"
                    aria-label={t("cart.remove")}
                    onClick={() => removeCartItem(item.listingId, item.startDate, item.endDate)}
                    className="shrink-0 text-muted hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {unitPrice !== null
                    ? t("common.priceDay", { price: unitPrice })
                    : t("common.priceRequest")}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, availableQuantity)}
                    value={item.quantity}
                    onChange={(event) =>
                      updateCartItem(item.listingId, item.startDate, item.endDate, {
                        quantity: Number(event.target.value),
                      })
                    }
                    aria-label={t("reservations.quantityLabel")}
                    className="h-9 w-16 rounded-lg border border-border px-2 text-center text-sm text-ink"
                  />
                  <input
                    type="date"
                    aria-label={t("search.from")}
                    min={todayIso()}
                    value={item.startDate}
                    onChange={(event) =>
                      updateCartItem(item.listingId, item.startDate, item.endDate, {
                        startDate: event.target.value,
                      })
                    }
                    className="h-9 rounded-lg border border-border px-2 text-xs text-ink"
                  />
                  <input
                    type="date"
                    aria-label={t("search.to")}
                    min={item.startDate || todayIso()}
                    value={item.endDate}
                    onChange={(event) =>
                      updateCartItem(item.listingId, item.startDate, item.endDate, {
                        endDate: event.target.value,
                      })
                    }
                    className="h-9 rounded-lg border border-border px-2 text-xs text-ink"
                  />
                </div>

                <p className="mt-2 text-xs text-muted">
                  {t("cart.durationDays", { count: durationDays(item.startDate, item.endDate) })}
                </p>

                {isMissingListing && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("cart.listingUnavailable")}
                  </p>
                )}
                {!isMissingListing && isOverstocked && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("cart.notEnoughStock", { available: availableQuantity })}
                  </p>
                )}

                <p className="mt-2 text-sm font-semibold text-ink">
                  {subtotal !== null
                    ? t("cart.subtotal", { amount: t("common.priceValue", { price: subtotal }) })
                    : t("common.priceRequest")}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {cart.ownerId && (
        <Link
          href={`/profiles/${cart.ownerId}`}
          className="mt-3 inline-block text-sm font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink"
        >
          {t("cart.addMoreFromOwner")}
        </Link>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-white p-5">
        <h2 className="text-sm font-semibold text-ink">{t("cart.fulfillmentTitle")}</h2>
        <div className="mt-3 flex gap-3">
          {(["pickup", "delivery"] as FulfillmentMethod[]).map((method) => (
            <label
              key={method}
              className={`flex flex-1 cursor-pointer items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                cart.fulfillmentMethod === method
                  ? "border-accent bg-accent/20 text-ink"
                  : "border-border text-muted hover:bg-subtle"
              }`}
            >
              <input
                type="radio"
                name="fulfillmentMethod"
                value={method}
                checked={cart.fulfillmentMethod === method}
                onChange={() => setCartDetails({ fulfillmentMethod: method })}
                className="sr-only"
              />
              {method === "pickup" ? t("cart.pickup") : t("cart.delivery")}
            </label>
          ))}
        </div>

        {cart.fulfillmentMethod === "delivery" && (
          <div className="mt-3">
            <label htmlFor="deliveryAddress" className="text-xs font-semibold text-ink">
              {t("cart.deliveryAddressLabel")}
            </label>
            <textarea
              id="deliveryAddress"
              rows={2}
              value={cart.deliveryAddress}
              onChange={(event) => setCartDetails({ deliveryAddress: event.target.value })}
              className="mt-1 w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              placeholder={t("cart.deliveryAddressPlaceholder")}
            />
          </div>
        )}

        <div className="mt-4">
          <label htmlFor="renterMessage" className="text-xs font-semibold text-ink">
            {t("cart.messageLabel")}
          </label>
          <textarea
            id="renterMessage"
            rows={3}
            maxLength={1000}
            value={cart.message}
            onChange={(event) => setCartDetails({ message: event.target.value })}
            className="mt-1 w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            placeholder={t("cart.messagePlaceholder")}
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-white p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">{t("cart.estimatedTotal")}</span>
          <span className="text-lg font-bold text-ink">
            {t("common.priceValue", { price: estimatedTotal })}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">{t("cart.serverRecalculates")}</p>

        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || hasBlockingIssue || needsDeliveryAddress || isLoadingAvailability}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {isSubmitting ? t("cart.submitting") : t("cart.submit")}
        </button>
      </div>
    </div>
  );
}
