"use client";

import { useState } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errorMessage";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { ReturnConditionStatus, RentalReturn } from "@/lib/supabase/types";

interface ReturnConditionFormProps {
  rentalRequestId: string;
  onSubmitted: (rentalReturn: RentalReturn) => void;
}

export default function ReturnConditionForm({ rentalRequestId, onSubmitted }: ReturnConditionFormProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState<ReturnConditionStatus>("good");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("submit_return_condition", {
      p_request_id: rentalRequestId,
      p_status: status,
      p_note: note.trim() || null,
    });
    setIsSubmitting(false);
    if (rpcError || !data) {
      console.error("[ReturnConditionForm] submit failed:", rpcError);
      setError(describeError(rpcError));
      return;
    }
    onSubmitted(data);
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <p className="text-sm font-semibold text-ink">{t("returnFlow.conditionTitle")}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setStatus("good")}
          className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors ${
            status === "good"
              ? "border-green-600 bg-green-50 text-green-800"
              : "border-border text-muted hover:bg-subtle"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {t("returnFlow.good")}
        </button>
        <button
          type="button"
          onClick={() => setStatus("issue")}
          className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors ${
            status === "issue"
              ? "border-amber-600 bg-amber-50 text-amber-800"
              : "border-border text-muted hover:bg-subtle"
          }`}
        >
          <TriangleAlert className="h-4 w-4" aria-hidden="true" />
          {t("returnFlow.issue")}
        </button>
      </div>

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={t("returnFlow.notePlaceholder")}
        rows={2}
        maxLength={500}
        className="mt-3 w-full resize-none rounded-xl border border-border bg-subtle px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />

      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}

      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleSubmit}
        className="mt-4 h-11 w-full rounded-xl bg-accent text-sm font-semibold text-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {isSubmitting ? t("common.saving") : t("returnFlow.submitCondition")}
      </button>
    </div>
  );
}
