import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type {
  Listing,
  Profile,
  Reservation,
  ReservationNotification,
} from "@/lib/supabase/types";
import MarkNotificationsRead from "@/components/notifications/MarkNotificationsRead";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

type NotificationRow = ReservationNotification & {
  actor: Pick<Profile, "full_name"> | null;
  reservations: (Reservation & {
    listings: Pick<Listing, "name" | "slug" | "owner_id"> | null;
  }) | null;
};

function notificationCopy(notification: NotificationRow) {
  const actorName = notification.actor?.full_name ?? "Un utilisateur";
  const listingName = notification.reservations?.listings?.name ?? "une annonce";

  if (notification.type === "reservation_requested") {
    return `${actorName} a envoyé une demande de réservation pour ${listingName}.`;
  }
  if (notification.type === "reservation_confirmed") {
    return `${actorName} a accepté votre demande pour ${listingName}.`;
  }
  if (notification.type === "reservation_declined") {
    return `${actorName} a refusé votre demande pour ${listingName}.`;
  }

  const renterCancelled =
    notification.actor_id === notification.reservations?.renter_id;
  return renterCancelled
    ? `${actorName} a annulé sa demande pour ${listingName}.`
    : `${actorName} a annulé la réservation pour ${listingName}.`;
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/notifications");
  }

  const { data: notifications } = await supabase
    .from("reservation_notifications")
    .select(
      "*, actor:profiles!reservation_notifications_actor_id_fkey(full_name), reservations(*, listings(name, slug, owner_id))",
    )
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<NotificationRow[]>();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-12 sm:px-6 lg:px-8">
      <MarkNotificationsRead />
      <h1 className="text-2xl font-bold tracking-tight text-ink">Notifications</h1>
      <p className="mt-2 text-sm text-muted">
        Réponses et changements concernant vos réservations.
      </p>

      {notifications && notifications.length > 0 ? (
        <ul className="mt-8 overflow-hidden rounded-2xl border border-border bg-white">
          {notifications.map((notification) => {
            const listing = notification.reservations?.listings;
            const isRenter = notification.reservations?.renter_id === user.id;
            const href = isRenter
              ? "/reservations"
              : listing
                ? `/listings/${listing.slug}`
                : "/account";

            return (
              <li
                key={notification.id}
                className={`border-b border-border last:border-b-0 ${
                  notification.read_at ? "bg-white" : "bg-amber-50/60"
                }`}
              >
                <Link
                  href={href}
                  className="flex gap-3 p-4 transition-colors hover:bg-subtle"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/40 text-ink">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-ink">
                      {notificationCopy(notification)}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(notification.created_at))}
                    </span>
                  </span>
                  {!notification.read_at && (
                    <span className="ml-auto mt-2 h-2 w-2 shrink-0 rounded-full bg-red-600" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-8 rounded-2xl border border-border bg-white p-8 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
          <h2 className="mt-3 font-semibold text-ink">Aucune notification</h2>
          <p className="mt-1 text-sm text-muted">
            Les réponses à vos demandes apparaîtront ici.
          </p>
        </div>
      )}
    </div>
  );
}
