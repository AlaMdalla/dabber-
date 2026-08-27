import Link from "@/components/i18n/LocalizedLink";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/ui/EmptyState";
import CancelReservationButton from "@/components/reservations/CancelReservationButton";
import type { AdminReservationRow, ReservationStatus } from "@/lib/supabase/types";
import { getServerI18n, getLocale } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/config";

function formatDate(isoDate: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

export default async function AdminReservationsPage() {
  const locale = await getLocale();
  const { t } = await getServerI18n();
  const supabase = await createClient();

  const { data: reservations } = await supabase
    .from("reservations")
    .select(
      "*, listings(id, name, slug, owner_id), profiles!reservations_renter_id_fkey(full_name, avatar_url)"
    )
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<AdminReservationRow[]>();

  const statusClasses: Record<ReservationStatus, string> = {
    pending: "bg-amber-100 text-amber-800",
    confirmed: "bg-green-100 text-green-800",
    declined: "bg-red-100 text-red-800",
    cancelled: "bg-slate-100 text-slate-700",
  };
  const statusLabels: Record<ReservationStatus, string> = {
    pending: t("calendar.pending"),
    confirmed: t("reservations.confirmedLabel"),
    declined: t("calendar.declined"),
    cancelled: t("calendar.cancelled"),
  };

  return (
    <div>
      {reservations && reservations.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {reservations.map((reservation) => {
            const canCancel =
              reservation.status === "pending" || reservation.status === "confirmed";

            return (
              <li
                key={reservation.id}
                className="rounded-2xl border border-border bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {reservation.listings ? (
                      <Link
                        href={`/listings/${reservation.listings.slug}`}
                        className="font-semibold text-ink hover:underline"
                      >
                        {reservation.listings.name}
                      </Link>
                    ) : (
                      <p className="font-semibold text-ink">{t("common.deletedListing")}</p>
                    )}
                    <p className="mt-1 text-xs text-muted">
                      {t("admin.renter")}: {reservation.profiles?.full_name ?? t("listing.dabberUser")}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                      {formatDate(reservation.start_date, locale)}
                      {reservation.end_date !== reservation.start_date &&
                        ` → ${formatDate(reservation.end_date, locale)}`}
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[reservation.status]}`}
                    >
                      {statusLabels[reservation.status]}
                    </span>
                  </div>
                  {canCancel && (
                    <CancelReservationButton reservationId={reservation.id} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={CalendarDays} title={t("admin.noReservations")} description="" />
      )}
    </div>
  );
}
