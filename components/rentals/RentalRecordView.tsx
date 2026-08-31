"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "@/components/i18n/LocalizedLink";
import { CalendarDays, CheckCircle2, ImageOff, MessageCircle, PackageCheck, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errorMessage";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { Locale } from "@/lib/i18n/config";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import type {
  Profile,
  RentalHandoverWithPhotos,
  RentalRequest,
  RentalRequestStatus,
  RentalRequestWithItems,
  RentalReturn,
  Review,
} from "@/lib/supabase/types";
import HandoverConditionForm from "@/components/rentals/HandoverConditionForm";
import ReturnConditionForm from "@/components/rentals/ReturnConditionForm";
import ShortCodeReveal from "@/components/rentals/ShortCodeReveal";
import ShortCodeEntry from "@/components/rentals/ShortCodeEntry";
import ReviewForm from "@/components/rentals/ReviewForm";
import { ReviewDisplay, ReviewPendingReveal } from "@/components/rentals/ReviewDisplay";

const STATUS_KEYS: Record<RentalRequestStatus, TranslationKey> = {
  pending: "calendar.pending",
  accepted: "rentalRequest.statusAccepted",
  active: "rentalRequest.statusActive",
  return_pending: "rentalRequest.statusReturnPending",
  rejected: "calendar.declined",
  cancelled: "calendar.cancelled",
  completed: "rentalRequest.statusCompleted",
  disputed: "rentalRequest.statusDisputed",
};

const STATUS_CLASSES: Record<RentalRequestStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-green-100 text-green-800",
  active: "bg-blue-100 text-blue-800",
  return_pending: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-slate-100 text-slate-700",
  completed: "bg-blue-100 text-blue-800",
  disputed: "bg-red-100 text-red-800",
};

function formatDate(isoDate: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}

interface RentalRecordViewProps {
  rental: RentalRequestWithItems;
  currentUserId: string;
  renterProfile: Pick<Profile, "full_name" | "avatar_url" | "whatsapp_number"> | null;
  ownerProfile: Pick<Profile, "full_name" | "avatar_url" | "whatsapp_number"> | null;
  initialHandover: RentalHandoverWithPhotos | null;
  initialHandoverPhotoUrls: Record<string, string>;
  initialReturn: RentalReturn | null;
  isMedicalRental: boolean;
  initialReviews: Review[];
}

export default function RentalRecordView({
  rental: initialRental,
  currentUserId,
  renterProfile,
  ownerProfile,
  initialHandover,
  initialHandoverPhotoUrls,
  initialReturn,
  isMedicalRental,
  initialReviews,
}: RentalRecordViewProps) {
  const { t, locale } = useI18n();
  const [rental, setRental] = useState(initialRental);
  const [handover, setHandover] = useState(initialHandover);
  const [rentalReturn, setRentalReturn] = useState(initialReturn);
  const [photoUrls, setPhotoUrls] = useState(initialHandoverPhotoUrls);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [reviews, setReviews] = useState(initialReviews);

  const isOwner = currentUserId === rental.owner_id;
  const isRenter = currentUserId === rental.renter_id;
  const counterpartName = (isOwner ? renterProfile?.full_name : ownerProfile?.full_name) ?? t("listing.dabberUser");
  const ownReview = reviews.find((review) => review.reviewer_id === currentUserId) ?? null;
  const counterpartReview = reviews.find((review) => review.reviewer_id !== currentUserId) ?? null;
  const total = rental.status === "pending" ? rental.estimated_total : (rental.confirmed_total ?? rental.estimated_total);

  // Live sync so both sides see the same state during the handover/return
  // exchange without a manual refresh.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`rental-record-${rental.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rental_requests", filter: `id=eq.${rental.id}` },
        (payload) => setRental((prev) => ({ ...prev, ...(payload.new as RentalRequest) })),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rental_handovers", filter: `rental_request_id=eq.${rental.id}` },
        (payload) =>
          setHandover((prev) => ({
            ...(prev ?? { rental_handover_photos: [] }),
            ...(payload.new as RentalHandoverWithPhotos),
          })),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rental_returns", filter: `rental_request_id=eq.${rental.id}` },
        (payload) => setRentalReturn(payload.new as RentalReturn),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reviews", filter: `rental_request_id=eq.${rental.id}` },
        (payload) => {
          const nextReview = payload.new as Review;
          setReviews((current) =>
            current.some((review) => review.id === nextReview.id) ? current : [...current, nextReview],
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [rental.id]);

  // Whenever the condition report changes, (re)fetch its photos and their
  // signed URLs -- the storage bucket is private, so only a short-lived
  // signed URL (not the row itself) can display them.
  useEffect(() => {
    if (!handover?.owner_submitted_at) return;
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const { data: photoRows } = await supabase
        .from("rental_handover_photos")
        .select("storage_path")
        .eq("handover_id", handover.id)
        .order("position");
      if (cancelled || !photoRows || photoRows.length === 0) return;

      const paths = photoRows.map((row) => row.storage_path as string);
      const { data: signed } = await supabase.storage
        .from("rental-condition-images")
        .createSignedUrls(paths, 3600);
      if (cancelled || !signed) return;

      setPhotoUrls((current) => {
        const next = { ...current };
        for (const entry of signed) {
          if (entry.signedUrl && entry.path) next[entry.path] = entry.signedUrl;
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [handover?.id, handover?.owner_submitted_at]);

  async function confirmCondition() {
    setActionError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("confirm_handover_condition", { p_request_id: rental.id });
    if (error || !data) {
      setActionError(describeError(error));
      return;
    }
    setHandover((prev) => ({ ...(prev ?? { rental_handover_photos: [] }), ...data }));
  }

  async function submitHandoverCode(code: string) {
    setIsSubmittingCode(true);
    setActionError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("confirm_handover_code", {
      p_request_id: rental.id,
      p_code: code,
    });
    setIsSubmittingCode(false);
    if (error || !data) {
      setActionError(describeError(error));
      return;
    }
    setRental((prev) => ({ ...prev, ...data }));
  }

  async function submitReturnCode(code: string) {
    setIsSubmittingCode(true);
    setActionError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("confirm_return_code", {
      p_request_id: rental.id,
      p_code: code,
    });
    setIsSubmittingCode(false);
    if (error || !data) {
      setActionError(describeError(error));
      return;
    }
    setRental((prev) => ({ ...prev, ...data }));
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted">
            {t("rentalRequest.reference", { reference: rental.id.slice(0, 8).toUpperCase() })}
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">{t("rentals.recordTitle")}</h1>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASSES[rental.status]}`}>
          {t(STATUS_KEYS[rental.status])}
        </span>
      </div>

      <p className="mt-4 rounded-xl bg-subtle px-4 py-3 text-xs text-muted">{t("rentals.trustNote")}</p>

      {/* Item summary, shared across every status */}
      <div className="mt-5 rounded-2xl border border-border bg-white p-4">
        <ul className="flex flex-col gap-3">
          {rental.rental_request_items.map((item) => (
            <li key={item.id} className="flex gap-3">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-subtle text-muted">
                {item.listing_image_url ? (
                  <Image src={item.listing_image_url} alt="" fill sizes="56px" className="object-cover" />
                ) : (
                  <ImageOff className="h-5 w-5" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {item.quantity} × {item.listing_title}
                </p>
                <p className="text-xs text-muted">
                  {formatDate(item.start_date, locale)} → {formatDate(item.end_date, locale)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted">
            {isOwner ? t("rentals.rentedBy", { name: counterpartName }) : t("rentals.rentedFrom", { name: counterpartName })}
          </span>
          <span className="font-bold text-ink">{t("common.priceValue", { price: total ?? 0 })}</span>
        </div>
      </div>

      <Link
        href={`/messages/${rental.conversation_id}`}
        className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-ink hover:bg-subtle"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        {isOwner ? t("rentals.contactRenter") : t("rentals.contactOwner")}
      </Link>

      {actionError && <p className="mt-3 text-sm font-medium text-red-600">{actionError}</p>}

      <div className="mt-5">
        {rental.status === "pending" && (
          <div className="rounded-2xl border border-border bg-white p-5 text-center text-sm text-muted">
            {isOwner ? t("rentals.pendingOwnerHint") : t("rentals.pendingRenterHint")}
          </div>
        )}

        {rental.status === "accepted" && (
          <>
            {(!handover || !handover.owner_submitted_at) &&
              (isOwner ? (
                <>
                  <p className="mb-2 text-sm font-semibold text-ink">{t("handover.prepareTitle")}</p>
                  <HandoverConditionForm
                    rentalRequestId={rental.id}
                    isMedical={isMedicalRental}
                    onSubmitted={(nextHandover) => setHandover(nextHandover)}
                  />
                </>
              ) : (
                <WaitingPanel text={t("handover.waitingForOwner")} />
              ))}

            {handover?.owner_submitted_at &&
              !handover.renter_confirmed_at &&
              (isRenter ? (
                <ConditionReview
                  note={handover.condition_note}
                  photoPaths={handover.rental_handover_photos.map((p) => p.storage_path)}
                  photoUrls={photoUrls}
                  onConfirm={confirmCondition}
                />
              ) : (
                <WaitingPanel text={t("handover.waitingForRenter")} />
              ))}

            {handover?.renter_confirmed_at &&
              !handover.code_confirmed_at &&
              (isRenter ? (
                <ShortCodeReveal
                  code={handover.code}
                  titleKey="handover.codeRevealTitle"
                  hintKey="handover.codeRevealHint"
                />
              ) : (
                <ShortCodeEntry
                  titleKey="handover.codeEntryTitle"
                  hintKey="handover.codeEntryHint"
                  submitLabelKey="handover.codeEntrySubmit"
                  isSubmitting={isSubmittingCode}
                  error={null}
                  onSubmit={submitHandoverCode}
                />
              ))}
          </>
        )}

        {rental.status === "active" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center">
              <PackageCheck className="mx-auto h-6 w-6 text-green-700" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-green-800">{t("rentals.activeTitle")}</p>
            </div>

            {isOwner && !showReturnForm && (
              <button
                type="button"
                onClick={() => setShowReturnForm(true)}
                className="h-11 w-full rounded-xl bg-ink text-sm font-semibold text-white transition-colors hover:bg-ink/90"
              >
                {t("returnFlow.confirmReturn")}
              </button>
            )}

            {isOwner && showReturnForm && (
              <ReturnConditionForm
                rentalRequestId={rental.id}
                onSubmitted={(nextReturn) => setRentalReturn(nextReturn)}
              />
            )}
          </div>
        )}

        {rental.status === "return_pending" && rentalReturn && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-border bg-white p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                {rentalReturn.condition_status === "issue" ? (
                  <TriangleAlert className="h-4 w-4 text-amber-600" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-700" aria-hidden="true" />
                )}
                {rentalReturn.condition_status === "issue" ? t("returnFlow.issue") : t("returnFlow.good")}
              </p>
              {rentalReturn.note && <p className="mt-2 text-sm text-muted">“{rentalReturn.note}”</p>}
            </div>

            {isOwner ? (
              <>
                <ShortCodeReveal
                  code={rentalReturn.code}
                  titleKey="returnFlow.codeRevealTitle"
                  hintKey="returnFlow.codeRevealHint"
                />
                <WaitingPanel text={t("returnFlow.waitingForRenter")} />
              </>
            ) : (
              <ShortCodeEntry
                titleKey="returnFlow.codeEntryTitle"
                hintKey="returnFlow.codeEntryHint"
                submitLabelKey="returnFlow.codeEntrySubmit"
                isSubmitting={isSubmittingCode}
                error={null}
                onSubmit={submitReturnCode}
              />
            )}
          </div>
        )}

        {rental.status === "completed" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center">
              <CheckCircle2 className="mx-auto h-7 w-7 text-blue-700" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-blue-800">{t("rentals.completedTitle")}</p>
              <p className="mt-1 text-sm text-blue-700">{t("rentals.completedDescription")}</p>
            </div>

            {ownReview ? (
              <ReviewDisplay review={ownReview} authorName={t("review.you")} />
            ) : (
              <ReviewForm
                rentalRequestId={rental.id}
                revieweeRole={isOwner ? "renter" : "owner"}
                onSubmitted={async (review) => {
                  // Submitting our own review can also reveal the
                  // counterpart's pre-existing one (if this is the 2nd
                  // review), so re-fetch rather than just appending --
                  // their row was never visible to us before this moment.
                  const supabase = createClient();
                  const { data } = await supabase
                    .from("reviews")
                    .select("*")
                    .eq("rental_request_id", rental.id)
                    .returns<Review[]>();
                  setReviews(data ?? [review]);
                }}
              />
            )}

            {counterpartReview ? (
              <ReviewDisplay review={counterpartReview} authorName={counterpartName} />
            ) : ownReview ? (
              <ReviewPendingReveal />
            ) : null}
          </div>
        )}

        {(rental.status === "rejected" || rental.status === "cancelled" || rental.status === "disputed") && (
          <div className="rounded-2xl border border-border bg-white p-5 text-center text-sm text-muted">
            <CalendarDays className="mx-auto mb-2 h-5 w-5" aria-hidden="true" />
            {t(STATUS_KEYS[rental.status])}
          </div>
        )}
      </div>
    </div>
  );
}

function WaitingPanel({ text }: { text: string }) {
  return <div className="rounded-2xl border border-border bg-white p-5 text-center text-sm text-muted">{text}</div>;
}

function ConditionReview({
  note,
  photoPaths,
  photoUrls,
  onConfirm,
}: {
  note: string | null;
  photoPaths: string[];
  photoUrls: Record<string, string>;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <p className="text-sm font-semibold text-ink">{t("handover.reviewTitle")}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {photoPaths.map((path) =>
          photoUrls[path] ? (
            <div key={path} className="relative aspect-square overflow-hidden rounded-xl border border-border">
              <Image src={photoUrls[path]} alt="" fill sizes="120px" className="object-cover" />
            </div>
          ) : (
            <div key={path} className="aspect-square animate-pulse rounded-xl border border-border bg-subtle" />
          ),
        )}
      </div>
      {note && <p className="mt-3 rounded-lg bg-subtle px-3 py-2 text-sm text-ink">“{note}”</p>}
      <button
        type="button"
        disabled={isConfirming}
        onClick={() => {
          setIsConfirming(true);
          onConfirm();
        }}
        className="mt-4 h-11 w-full rounded-xl bg-accent text-sm font-semibold text-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {t("handover.confirmCondition")}
      </button>
    </div>
  );
}
