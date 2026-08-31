import type { Metadata } from "next";
import Link from "@/components/i18n/LocalizedLink";
import { redirect } from "next/navigation";
import { Bell, CalendarDays, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type {
  Listing,
  Profile,
  RentalRequest,
  RentalRequestNotification,
  Reservation,
  ReservationNotification,
} from "@/lib/supabase/types";
import MarkNotificationsRead from "@/components/notifications/MarkNotificationsRead";
import { getServerI18n } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/config";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

type Translate = (key: string, values?: Record<string, string | number>) => string;

type ReservationNotificationRow = ReservationNotification & {
  actor: Pick<Profile, "full_name"> | null;
  reservations: (Reservation & {
    listings: Pick<Listing, "name" | "slug" | "owner_id"> | null;
  }) | null;
};

type RentalRequestNotificationRow = RentalRequestNotification & {
  actor: Pick<Profile, "full_name"> | null;
  rental_requests:
    | (RentalRequest & { rental_request_items: Array<{ id: string }> })
    | null;
};

interface FeedItem {
  id: string;
  created_at: string;
  read_at: string | null;
  href: string;
  icon: "reservation" | "rental_request";
  copy: string;
}

function reservationCopy(notification: ReservationNotificationRow, t: Translate) {
  const actorName = notification.actor?.full_name ?? t("notifications.user");
  const listingName = notification.reservations?.listings?.name ?? t("notifications.aListing");

  if (notification.type === "reservation_requested") {
    return t("notifications.requested", { actor: actorName, listing: listingName });
  }
  if (notification.type === "reservation_confirmed") {
    return t("notifications.confirmed", { actor: actorName, listing: listingName });
  }
  if (notification.type === "reservation_declined") {
    return t("notifications.declined", { actor: actorName, listing: listingName });
  }

  const renterCancelled = notification.actor_id === notification.reservations?.renter_id;
  return renterCancelled
    ? t("notifications.renterCancelled", { actor: actorName, listing: listingName })
    : t("notifications.ownerCancelled", { actor: actorName, listing: listingName });
}

function rentalRequestCopy(notification: RentalRequestNotificationRow, t: Translate) {
  const actorName = notification.actor?.full_name ?? t("notifications.user");
  const count = notification.rental_requests?.rental_request_items.length ?? 0;

  switch (notification.type) {
    case "rental_request_submitted":
      return t("notifications.rentalRequestSubmitted", { actor: actorName, count });
    case "rental_request_accepted":
      return t("notifications.rentalRequestAccepted", { actor: actorName });
    case "rental_request_rejected":
      return t("notifications.rentalRequestRejected", { actor: actorName });
    case "rental_request_cancelled":
      return t("notifications.rentalRequestCancelled", { actor: actorName });
    case "handover_condition_submitted":
      return t("notifications.handoverConditionSubmitted", { actor: actorName });
    case "handover_confirmed":
      return t("notifications.handoverConfirmed", { actor: actorName });
    case "rental_active":
      return t("notifications.rentalActive");
    case "return_condition_submitted":
      return t("notifications.returnConditionSubmitted", { actor: actorName });
    case "rental_completed":
      return t("notifications.rentalCompleted");
    case "review_received":
      return t("notifications.reviewReceived", { actor: actorName });
    case "reviews_revealed":
      return t("notifications.reviewsRevealed");
  }
}

export default async function NotificationsPage() {
  const { locale, t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/notifications");
  }

  const [{ data: reservationNotifications }, { data: rentalRequestNotifications }] =
    await Promise.all([
      supabase
        .from("reservation_notifications")
        .select(
          "*, actor:profiles!reservation_notifications_actor_id_fkey(full_name), reservations(*, listings(name, slug, owner_id))",
        )
        .order("created_at", { ascending: false })
        .limit(50)
        .returns<ReservationNotificationRow[]>(),
      supabase
        .from("rental_request_notifications")
        .select(
          "*, actor:profiles!rental_request_notifications_actor_id_fkey(full_name), rental_requests(*, rental_request_items(id))",
        )
        .order("created_at", { ascending: false })
        .limit(50)
        .returns<RentalRequestNotificationRow[]>(),
    ]);

  const items: FeedItem[] = [
    ...(reservationNotifications ?? []).map((notification) => {
      const listing = notification.reservations?.listings;
      const isRenter = notification.reservations?.renter_id === user.id;
      return {
        id: `reservation-${notification.id}`,
        created_at: notification.created_at,
        read_at: notification.read_at,
        href: isRenter ? "/reservations" : listing ? `/listings/${listing.slug}` : "/account",
        icon: "reservation" as const,
        copy: reservationCopy(notification, t),
      };
    }),
    ...(rentalRequestNotifications ?? []).map((notification) => {
      const conversationId = notification.rental_requests?.conversation_id;
      const isLifecycleUpdate = notification.type !== "rental_request_submitted";
      const href = isLifecycleUpdate
        ? `/rentals/${notification.rental_request_id}`
        : conversationId
          ? `/messages/${conversationId}`
          : "/messages";
      return {
        id: `rental-request-${notification.id}`,
        created_at: notification.created_at,
        read_at: notification.read_at,
        href,
        icon: "rental_request" as const,
        copy: rentalRequestCopy(notification, t),
      };
    }),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-12 sm:px-6 lg:px-8">
      <MarkNotificationsRead />
      <h1 className="text-2xl font-bold tracking-tight text-ink">{t("nav.notifications")}</h1>
      <p className="mt-2 text-sm text-muted">
        {t("notifications.description")}
      </p>

      {items.length > 0 ? (
        <ul className="mt-8 overflow-hidden rounded-2xl border border-border bg-white">
          {items.map((item) => (
            <li
              key={item.id}
              className={`border-b border-border last:border-b-0 ${
                item.read_at ? "bg-white" : "bg-amber-50/60"
              }`}
            >
              <Link href={item.href} className="flex gap-3 p-4 transition-colors hover:bg-subtle">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/40 text-ink">
                  {item.icon === "rental_request" ? (
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-ink">{item.copy}</span>
                  <span className="mt-1 block text-xs text-muted">
                    {formatNotificationDate(item.created_at, locale)}
                  </span>
                </span>
                {!item.read_at && (
                  <span className="ms-auto mt-2 h-2 w-2 shrink-0 rounded-full bg-red-600" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 rounded-2xl border border-border bg-white p-8 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
          <h2 className="mt-3 font-semibold text-ink">{t("notifications.empty")}</h2>
          <p className="mt-1 text-sm text-muted">
            {t("notifications.emptyDescription")}
          </p>
        </div>
      )}
    </div>
  );
}

function formatNotificationDate(isoDate: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoDate));
}
