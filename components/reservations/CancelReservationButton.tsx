"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errorMessage";
import { useI18n } from "@/components/i18n/LocaleProvider";

interface CancelReservationButtonProps {
  reservationId: string;
}

export default function CancelReservationButton({
  reservationId,
}: CancelReservationButtonProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    if (!window.confirm(t("reservations.cancelConfirm"))) return;

    setIsCancelling(true);
    setError(null);
    const supabase = createClient();
    const { error: cancelError } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", reservationId);

    if (cancelError) {
      setError(describeError(cancelError));
      setIsCancelling(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="text-end">
      <button
        type="button"
        onClick={handleCancel}
        disabled={isCancelling}
        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
      >
        {isCancelling ? t("reservations.cancelling") : t("reservations.cancelAction")}
      </button>
      {error && <p className="mt-1 max-w-xs text-xs text-red-600">{error}</p>}
    </div>
  );
}
