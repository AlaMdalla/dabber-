"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/i18n/LocalizedLink";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errorMessage";
import type {
  AvailabilityRange,
  ReservationStatus,
  ReservationWithRenter,
} from "@/lib/supabase/types";
import { useI18n } from "@/components/i18n/LocaleProvider";

interface AvailabilityCalendarProps {
  listingId: string;
  listingSlug: string;
  isOwner: boolean;
  currentUserId: string | null;
}

type DayStatus = "green" | "orange" | "red";

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// `new Date("YYYY-MM-DD")` parses as UTC midnight, which can render as the
// previous day in timezones behind UTC. Build from local parts instead.
function fromISODate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getDayStatus(iso: string, ranges: AvailabilityRange[]): DayStatus {
  let status: DayStatus = "green";
  for (const range of ranges) {
    if (iso >= range.start_date && iso <= range.end_date) {
      if (range.status === "confirmed") return "red";
      status = "orange";
    }
  }
  return status;
}

function buildMonthGrid(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  // getDay(): 0 = Sunday ... 6 = Saturday. Grid starts on Monday.
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = Array(leadingBlanks).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

export default function AvailabilityCalendar({
  listingId,
  listingSlug,
  isOwner,
  currentUserId,
}: AvailabilityCalendarProps) {
  const { locale, t } = useI18n();
  const weekdayLabels = t("calendar.weekdays").split(",");
  const statusLabel: Record<ReservationStatus, string> = {
    pending: t("calendar.pending"),
    confirmed: t("status.confirmed"),
    declined: t("calendar.declined"),
    cancelled: t("calendar.cancelled"),
  };
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [ranges, setRanges] = useState<AvailabilityRange[]>([]);
  const [ownerReservations, setOwnerReservations] = useState<
    ReservationWithRenter[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function fetchAvailability(): Promise<{
    ranges: AvailabilityRange[];
    ownerReservations: ReservationWithRenter[];
  }> {
    const supabase = createClient();

    if (isOwner) {
      const { data, error: fetchError } = await supabase
        .from("reservations")
        .select("*, profiles(full_name, avatar_url)")
        .eq("listing_id", listingId)
        .in("status", ["pending", "confirmed"])
        .order("start_date")
        .returns<ReservationWithRenter[]>();

      if (fetchError) {
        console.error("[AvailabilityCalendar] fetch failed:", fetchError);
        return { ranges: [], ownerReservations: [] };
      }

      return {
        ownerReservations: data ?? [],
        ranges: (data ?? []).map((r) => ({
          listing_id: r.listing_id,
          start_date: r.start_date,
          end_date: r.end_date,
          status: r.status as "pending" | "confirmed",
        })),
      };
    }

    const { data, error: fetchError } = await supabase
      .from("listing_availability")
      .select("*")
      .eq("listing_id", listingId)
      .returns<AvailabilityRange[]>();

    if (fetchError) {
      console.error("[AvailabilityCalendar] fetch failed:", fetchError);
      return { ranges: [], ownerReservations: [] };
    }

    return { ranges: data ?? [], ownerReservations: [] };
  }

  function loadAvailability() {
    return fetchAvailability().then(({ ranges, ownerReservations }) => {
      setRanges(ranges);
      setOwnerReservations(ownerReservations);
      setIsLoading(false);
    });
  }

  useEffect(() => {
    loadAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, isOwner]);

  const todayIso = toISODate(today);
  const weeks = useMemo(() => {
    const cells = buildMonthGrid(cursor.getFullYear(), cursor.getMonth());
    const grid: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) grid.push(cells.slice(i, i + 7));
    return grid;
  }, [cursor]);

  function isPast(iso: string) {
    return iso < todayIso;
  }

  function handleDayClick(iso: string, status: DayStatus) {
    if (isOwner || isPast(iso) || status === "red") return;
    setError(null);
    setNotice(null);

    if (!selectedStart || (selectedStart && selectedEnd)) {
      setSelectedStart(iso);
      setSelectedEnd(null);
      return;
    }

    if (iso < selectedStart) {
      setSelectedStart(iso);
      setSelectedEnd(null);
      return;
    }

    // Reject a range that crosses a red (confirmed) day.
    for (const day of eachIsoDayInRange(selectedStart, iso)) {
      if (getDayStatus(day, ranges) === "red") {
        setError(
          t("calendar.overlap")
        );
        return;
      }
    }

    setSelectedEnd(iso);
  }

  function eachIsoDayInRange(startIso: string, endIso: string) {
    const days: string[] = [];
    const start = new Date(startIso);
    const end = new Date(endIso);
    for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
      days.push(toISODate(d));
    }
    return days;
  }

  async function handleReserve() {
    if (!currentUserId || !selectedStart || !selectedEnd) return;

    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();

    try {
      const { error: insertError } = await supabase.from("reservations").insert({
        listing_id: listingId,
        renter_id: currentUserId,
        start_date: selectedStart,
        end_date: selectedEnd,
      });

      if (insertError) throw insertError;

      setNotice(
        t("calendar.sent")
      );
      setSelectedStart(null);
      setSelectedEnd(null);
      await loadAvailability();
    } catch (err) {
      console.error("[AvailabilityCalendar] reservation failed:", err);
      setError(describeError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOwnerAction(
    reservationId: string,
    status: "confirmed" | "declined" | "cancelled"
  ) {
    setError(null);
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("reservations")
      .update({ status })
      .eq("id", reservationId);

    if (updateError) {
      console.error("[AvailabilityCalendar] owner action failed:", updateError);
      setError(describeError(updateError));
      return;
    }

    await loadAvailability();
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">{t("calendar.availability")}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={t("calendar.previous")}
            onClick={() =>
              setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-subtle hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="min-w-[9rem] text-center text-sm font-medium capitalize text-ink">
            {cursor.toLocaleDateString(locale, {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            type="button"
            aria-label={t("calendar.next")}
            onClick={() =>
              setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-subtle hover:text-ink"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted">
        {weekdayLabels.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div
        className={`mt-1 grid grid-cols-7 gap-1 ${isLoading ? "opacity-50" : ""}`}
      >
        {weeks.flat().map((date, index) => {
          if (!date) return <div key={`blank-${index}`} />;

          const iso = toISODate(date);
          const status = getDayStatus(iso, ranges);
          const past = isPast(iso);
          const isSelected =
            selectedStart &&
            iso >= selectedStart &&
            iso <= (selectedEnd ?? selectedStart);

          const colorClasses = past
            ? "bg-subtle text-muted cursor-not-allowed"
            : status === "red"
              ? "bg-red-100 text-red-800 cursor-not-allowed"
              : status === "orange"
                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                : "bg-green-100 text-green-800 hover:bg-green-200";

          return (
            <button
              key={iso}
              type="button"
              disabled={isOwner || past || status === "red"}
              onClick={() => handleDayClick(iso, status)}
              className={`flex h-9 items-center justify-center rounded-lg text-xs font-medium transition-colors disabled:cursor-not-allowed ${colorClasses} ${
                isSelected ? "ring-2 ring-accent ring-offset-1" : ""
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          {t("common.available")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          {t("calendar.requestedLegend")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          {t("calendar.full")}
        </span>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-3 text-xs font-medium text-green-700">{notice}</p>
      )}

      {!isOwner && selectedStart && (
        <div className="mt-4 rounded-xl border border-border bg-subtle p-3.5">
          <p className="text-xs text-muted">
            {t("calendar.selected")}{" "}
            <span className="font-medium text-ink">
              {fromISODate(selectedStart).toLocaleDateString(locale)}
              {selectedEnd &&
                selectedEnd !== selectedStart &&
                ` → ${fromISODate(selectedEnd).toLocaleDateString(locale)}`}
            </span>
          </p>

          {!currentUserId ? (
            <Link
              href={`/login?next=/listings/${listingSlug}`}
              className="mt-3 flex h-10 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover"
            >
              {t("calendar.login")}
            </Link>
          ) : (
            <button
              type="button"
              disabled={!selectedEnd || isSubmitting}
              onClick={handleReserve}
              className="mt-3 h-10 w-full rounded-xl bg-accent px-4 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {isSubmitting
                ? t("common.sending")
                : selectedEnd
                  ? t("calendar.request")
                  : t("calendar.chooseEnd")}
            </button>
          )}
        </div>
      )}

      {isOwner && ownerReservations.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <h4 className="text-xs font-semibold text-ink">
            {t("calendar.requests")}
          </h4>
          <ul className="mt-2 flex flex-col gap-2">
            {ownerReservations.map((reservation) => (
              <li
                key={reservation.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
              >
                <div>
                  <p className="text-xs font-medium text-ink">
                    {reservation.profiles?.full_name ?? t("listing.dabberUser")}
                  </p>
                  <p className="text-xs text-muted">
                    {fromISODate(reservation.start_date).toLocaleDateString(
                      locale
                    )}
                    {reservation.end_date !== reservation.start_date &&
                      ` → ${fromISODate(reservation.end_date).toLocaleDateString(locale)}`}
                    {" · "}
                    <span
                      className={
                        reservation.status === "confirmed"
                          ? "text-green-700"
                          : "text-amber-700"
                      }
                    >
                      {statusLabel[reservation.status]}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {reservation.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => handleOwnerAction(reservation.id, "confirmed")}
                      className="rounded-lg bg-green-100 px-2.5 py-1.5 text-xs font-medium text-green-800 transition-colors hover:bg-green-200"
                    >
                      {t("common.confirm")}
                    </button>
                  )}
                  <button
                    type="button"
                      onClick={() =>
                        handleOwnerAction(
                          reservation.id,
                          reservation.status === "pending" ? "declined" : "cancelled",
                        )
                      }
                    className="rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-medium text-red-800 transition-colors hover:bg-red-200"
                  >
                    {reservation.status === "pending" ? t("common.decline") : t("common.cancel")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
