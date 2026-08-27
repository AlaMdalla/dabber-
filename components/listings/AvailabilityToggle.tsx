"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errorMessage";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { Availability } from "@/lib/supabase/types";

interface AvailabilityToggleProps {
  listingId: string;
  availability: Availability;
}

export default function AvailabilityToggle({
  listingId,
  availability,
}: AvailabilityToggleProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAvailable = availability === "disponible";
  const nextValue: Availability = isAvailable ? "a-confirmer" : "disponible";

  async function handleToggle() {
    setIsUpdating(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("listings")
      .update({ availability: nextValue })
      .eq("id", listingId);

    if (updateError) {
      console.error("[AvailabilityToggle] update failed:", updateError);
      setError(t("listing.availabilityUpdateFailed", { error: describeError(updateError) }));
      setIsUpdating(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isUpdating}
        aria-label={isAvailable ? t("listing.markAsToConfirm") : t("listing.markAsAvailable")}
        title={t("listing.availabilityHint")}
        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 ${
          isAvailable
            ? "bg-green-100 text-green-800 hover:bg-green-200"
            : "bg-amber-100 text-amber-800 hover:bg-amber-200"
        }`}
      >
        {isUpdating
          ? t("common.saving")
          : isAvailable
            ? t("common.available")
            : t("common.toConfirm")}
      </button>
      {error && (
        <p role="alert" className="max-w-[10rem] text-end text-[11px] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
