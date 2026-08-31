"use client";

import { Star } from "lucide-react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { REVIEW_TAG_LABEL_KEYS } from "@/lib/reviews";
import type { Review } from "@/lib/supabase/types";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={`h-4 w-4 ${value <= rating ? "fill-accent text-accent" : "fill-none text-border"}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/** The counterpart's review, shown once it's revealed (RLS already guarantees a fetch only ever returns visible rows). */
export function ReviewDisplay({ review, authorName }: { review: Review; authorName: string }) {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">{t("review.from", { name: authorName })}</p>
        <Stars rating={review.rating} />
      </div>
      {review.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {review.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-subtle px-2.5 py-1 text-[11px] font-medium text-ink">
              {t(REVIEW_TAG_LABEL_KEYS[tag])}
            </span>
          ))}
        </div>
      )}
      {review.comment && <p className="mt-3 text-sm text-ink">“{review.comment}”</p>}
    </div>
  );
}

/** Shown to a reviewer who has already submitted, while waiting for the counterpart's review or the 14-day reveal window. */
export function ReviewPendingReveal() {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-border bg-subtle p-5 text-center text-sm text-muted">
      {t("review.pendingReveal")}
    </div>
  );
}
