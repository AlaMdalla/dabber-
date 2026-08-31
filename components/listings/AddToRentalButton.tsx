"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errorMessage";
import { addCartItem, replaceCartWithItem } from "@/lib/cart";
import { showToast } from "@/lib/toast";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { AvailabilityRange } from "@/lib/supabase/types";

interface AddToRentalButtonProps {
  listingId: string;
  listingSlug: string;
  listingName: string;
  listingImageUrl: string | null;
  unitPrice: number | null;
  weeklyPrice?: number | null;
  monthlyPrice?: number | null;
  availableQuantity: number;
  ownerId: string;
  ownerName: string | null;
}

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function AddToRentalButton({
  listingId,
  listingSlug,
  listingName,
  listingImageUrl,
  unitPrice,
  weeklyPrice = null,
  monthlyPrice = null,
  availableQuantity,
  ownerId,
  ownerName,
}: AddToRentalButtonProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (availableQuantity < 1) {
    return (
      <span className="inline-flex h-10 items-center justify-center rounded-xl bg-subtle px-4 text-xs font-medium text-muted">
        {t("common.toConfirm")}
      </span>
    );
  }

  async function handleConfirm() {
    if (!startDate || !endDate) {
      setError(t("cart.selectDates"));
      return;
    }
    if (endDate < startDate) {
      setError(t("cart.invalidRange"));
      return;
    }
    if (quantity < 1 || quantity > availableQuantity) {
      setError(t("cart.invalidQuantity"));
      return;
    }

    setIsChecking(true);
    setError(null);

    // UX-only precheck: confirm nothing was fully booked/blocked for the
    // chosen range since the page loaded. The server re-validates
    // authoritatively at submission and again at acceptance regardless.
    const supabase = createClient();
    const { data: ranges, error: fetchError } = await supabase
      .from("listing_availability")
      .select("*")
      .eq("listing_id", listingId)
      .eq("status", "confirmed")
      .lte("start_date", endDate)
      .gte("end_date", startDate)
      .returns<AvailabilityRange[]>();
    setIsChecking(false);

    if (fetchError) {
      setError(describeError(fetchError));
      return;
    }
    if (ranges && ranges.length > 0) {
      setError(t("cart.datesUnavailable"));
      return;
    }

    const item = {
      listingId,
      listingSlug,
      listingName,
      listingImageUrl,
      unitPrice,
      weeklyPrice,
      monthlyPrice,
      availableQuantity,
      quantity,
      startDate,
      endDate,
    };

    const result = addCartItem({ id: ownerId, name: ownerName }, item);

    if (result === "different-owner") {
      const confirmed = window.confirm(t("cart.differentOwnerConfirm"));
      if (!confirmed) return;
      replaceCartWithItem({ id: ownerId, name: ownerName }, item);
    }

    showToast(t("cart.itemAdded", { name: listingName }));
    setIsOpen(false);
    setQuantity(1);
    setStartDate("");
    setEndDate("");
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
        {t("cart.addToRental")}
      </button>
    );
  }

  return (
    <div
      className="flex flex-col gap-2.5 rounded-xl border border-border bg-subtle p-3"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={`qty-${listingId}`}>
          {t("reservations.quantityLabel")}
        </label>
        <button
          type="button"
          aria-label={t("cart.decreaseQuantity")}
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink hover:bg-white"
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <input
          id={`qty-${listingId}`}
          type="number"
          min={1}
          max={availableQuantity}
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value))}
          className="h-8 w-12 rounded-lg border border-border text-center text-sm text-ink"
        />
        <button
          type="button"
          aria-label={t("cart.increaseQuantity")}
          onClick={() => setQuantity((q) => Math.min(availableQuantity, q + 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink hover:bg-white"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <span className="text-xs text-muted">{t("cart.maxAvailable", { count: availableQuantity })}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          aria-label={t("search.from")}
          min={todayIso()}
          value={startDate}
          onChange={(event) => {
            setStartDate(event.target.value);
            if (endDate && endDate < event.target.value) setEndDate("");
          }}
          className="h-9 rounded-lg border border-border px-2 text-xs text-ink"
        />
        <input
          type="date"
          aria-label={t("search.to")}
          min={startDate || todayIso()}
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          className="h-9 rounded-lg border border-border px-2 text-xs text-ink"
        />
      </div>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="h-9 flex-1 rounded-lg border border-border text-xs font-medium text-ink hover:bg-white"
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isChecking}
          className="h-9 flex-1 rounded-lg bg-accent text-xs font-semibold text-ink hover:bg-accent-hover disabled:opacity-60"
        >
          {isChecking ? t("common.sending") : t("cart.confirmAdd")}
        </button>
      </div>
    </div>
  );
}
