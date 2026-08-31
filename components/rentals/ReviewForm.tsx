"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errorMessage";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { OWNER_REVIEW_TAGS, RENTER_REVIEW_TAGS, REVIEW_TAG_LABEL_KEYS } from "@/lib/reviews";
import type { Review, ReviewTag } from "@/lib/supabase/types";

interface ReviewFormProps {
  rentalRequestId: string;
  /** Whether the reviewee is the owner (renter is writing) or the renter (owner is writing). */
  revieweeRole: "owner" | "renter";
  onSubmitted: (review: Review) => void;
}

export default function ReviewForm({ rentalRequestId, revieweeRole, onSubmitted }: ReviewFormProps) {
  const { t } = useI18n();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState<ReviewTag[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableTags = revieweeRole === "owner" ? OWNER_REVIEW_TAGS : RENTER_REVIEW_TAGS;

  function toggleTag(tag: ReviewTag) {
    setTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]));
  }

  async function handleSubmit() {
    if (rating === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("submit_review", {
      p_rental_request_id: rentalRequestId,
      p_rating: rating,
      p_comment: comment.trim() || null,
      p_tags: tags,
    });

    setIsSubmitting(false);
    if (rpcError || !data) {
      setError(describeError(rpcError));
      return;
    }

    onSubmitted(data as Review);
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <p className="text-sm font-semibold text-ink">
        {t(revieweeRole === "owner" ? "review.formTitleOwner" : "review.formTitleRenter")}
      </p>

      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={t("review.ratingStar", { value })}
            onMouseEnter={() => setHoverRating(value)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(value)}
            className="p-0.5"
          >
            <Star
              className={`h-7 w-7 ${
                value <= (hoverRating || rating) ? "fill-accent text-accent" : "fill-none text-border"
              }`}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {availableTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              tags.includes(tag)
                ? "border-accent bg-accent/20 text-ink"
                : "border-border bg-white text-muted hover:bg-subtle"
            }`}
          >
            {t(REVIEW_TAG_LABEL_KEYS[tag])}
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder={t("review.commentPlaceholder")}
        rows={3}
        maxLength={1000}
        className="mt-3 w-full resize-none rounded-xl border border-border bg-subtle px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />

      <p className="mt-2 text-xs text-muted">{t("review.blindNote")}</p>

      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}

      <button
        type="button"
        disabled={rating === 0 || isSubmitting}
        onClick={handleSubmit}
        className="mt-4 h-11 w-full rounded-xl bg-accent text-sm font-semibold text-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {isSubmitting ? t("common.sending") : t("review.submit")}
      </button>
    </div>
  );
}
