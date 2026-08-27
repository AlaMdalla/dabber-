import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, ImageOff } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type {
  ReservationStatus,
  ReservationWithListing,
} from "@/lib/supabase/types";
import CancelReservationButton from "@/components/reservations/CancelReservationButton";

export const metadata: Metadata = {
  title: "Mes réservations",
  robots: { index: false, follow: false },
};

const STATUS_DETAILS: Record<
  ReservationStatus,
  { label: string; classes: string; message: string }
> = {
  pending: {
    label: "En attente",
    classes: "bg-amber-100 text-amber-800",
    message: "Le propriétaire n’a pas encore répondu à votre demande.",
  },
  confirmed: {
    label: "Acceptée",
    classes: "bg-green-100 text-green-800",
    message: "Le propriétaire a confirmé votre réservation.",
  },
  declined: {
    label: "Refusée",
    classes: "bg-red-100 text-red-800",
    message: "Le propriétaire a refusé votre demande.",
  },
  cancelled: {
    label: "Annulée",
    classes: "bg-slate-100 text-slate-700",
    message: "Cette réservation a été annulée.",
  },
};

function formatDate(isoDate: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

function threeDaysFromToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Tunis",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const value = (type: "year" | "month" | "day") =>
    Number(parts.find((part) => part.type === type)?.value);
  const date = new Date(Date.UTC(value("year"), value("month") - 1, value("day")));
  date.setUTCDate(date.getUTCDate() + 3);
  return date.toISOString().slice(0, 10);
}

export default async function ReservationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/reservations");
  }

  const { data: reservations } = await supabase
    .from("reservations")
    .select("*, listings(id, name, slug, image_url, owner_id)")
    .eq("renter_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<ReservationWithListing[]>();

  const cancellationCutoff = threeDaysFromToday();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink">
        Mes réservations
      </h1>
      <p className="mt-2 text-sm text-muted">
        Consultez les réponses des propriétaires et les périodes demandées.
      </p>

      {reservations && reservations.length > 0 ? (
        <ul className="mt-8 flex flex-col gap-4">
          {reservations.map((reservation) => {
            const status = STATUS_DETAILS[reservation.status];
            const canCancel =
              reservation.status === "pending" ||
              (reservation.status === "confirmed" &&
                reservation.start_date >= cancellationCutoff);

            return (
              <li
                key={reservation.id}
                className="rounded-2xl border border-border bg-white p-4 sm:p-5"
              >
                <div className="flex gap-4">
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-subtle text-muted">
                    {reservation.listings?.image_url ? (
                      <Image
                        src={reservation.listings.image_url}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <ImageOff className="h-6 w-6" aria-hidden="true" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {reservation.listings ? (
                      <Link
                        href={`/listings/${reservation.listings.slug}`}
                        className="font-semibold text-ink hover:underline"
                      >
                        {reservation.listings.name}
                      </Link>
                    ) : (
                      <p className="font-semibold text-ink">Annonce supprimée</p>
                    )}
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                      {formatDate(reservation.start_date)}
                      {reservation.end_date !== reservation.start_date &&
                        ` → ${formatDate(reservation.end_date)}`}
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status.classes}`}
                    >
                      {status.label}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm text-muted">{status.message}</p>
                    {reservation.status === "confirmed" && !canCancel && (
                      <p className="mt-1 text-xs text-muted">
                        L’annulation en ligne ferme trois jours avant le début.
                      </p>
                    )}
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
        <div className="mt-8 rounded-2xl border border-border bg-white p-8 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
          <h2 className="mt-3 font-semibold text-ink">Aucune réservation</h2>
          <p className="mt-1 text-sm text-muted">
            Vos demandes et les réponses des propriétaires apparaîtront ici.
          </p>
          <Link
            href="/listings"
            className="mt-5 inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-ink hover:bg-accent-hover"
          >
            Explorer les annonces
          </Link>
        </div>
      )}
    </div>
  );
}
