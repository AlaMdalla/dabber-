import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/i18n/LocalizedLink";
import { redirect } from "next/navigation";
import { ImageOff, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Profile, RentalRequestStatus, RentalRequestWithItems } from "@/lib/supabase/types";
import { getServerI18n } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export const metadata: Metadata = {
  title: "Mes locations",
  robots: { index: false, follow: false },
};

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

type RentalRow = RentalRequestWithItems & {
  renter: Pick<Profile, "full_name"> | null;
  owner: Pick<Profile, "full_name"> | null;
};

export default async function RentalsPage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/rentals");
  }

  const { data: rentals } = await supabase
    .from("rental_requests")
    .select(
      "*, rental_request_items(id, listing_title, listing_image_url, quantity), renter:profiles!rental_requests_renter_id_fkey(full_name), owner:profiles!rental_requests_owner_id_fkey(full_name)",
    )
    .or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`)
    .order("updated_at", { ascending: false })
    .limit(100)
    .returns<RentalRow[]>();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink">{t("rentals.title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("rentals.description")}</p>

      {rentals && rentals.length > 0 ? (
        <ul className="mt-8 flex flex-col gap-3">
          {rentals.map((rental) => {
            const isOwner = rental.owner_id === user.id;
            const counterpartName =
              (isOwner ? rental.renter?.full_name : rental.owner?.full_name) ?? t("listing.dabberUser");
            const itemCount = rental.rental_request_items.reduce((sum, item) => sum + item.quantity, 0);
            const firstItem = rental.rental_request_items[0];
            const total = rental.status === "pending" ? rental.estimated_total : (rental.confirmed_total ?? rental.estimated_total);

            return (
              <li key={rental.id}>
                <Link
                  href={rental.status === "pending" ? `/messages/${rental.conversation_id}` : `/rentals/${rental.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:p-5"
                >
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-subtle text-muted">
                    {firstItem?.listing_image_url ? (
                      <Image src={firstItem.listing_image_url} alt="" fill sizes="64px" className="object-cover" />
                    ) : (
                      <ImageOff className="h-5 w-5" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {isOwner
                        ? t("rentals.rentedBy", { name: counterpartName })
                        : t("rentals.rentedFrom", { name: counterpartName })}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {t("rentalRequest.compactSummary", { count: itemCount, total: t("common.priceValue", { price: total ?? 0 }) })}
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[rental.status]}`}
                    >
                      {t(STATUS_KEYS[rental.status])}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-8 rounded-2xl border border-border bg-white p-8 text-center">
          <Package className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
          <h2 className="mt-3 font-semibold text-ink">{t("rentals.empty")}</h2>
          <p className="mt-1 text-sm text-muted">{t("rentals.emptyDescription")}</p>
          <Link
            href="/listings"
            className="mt-5 inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-ink hover:bg-accent-hover"
          >
            {t("reservations.explore")}
          </Link>
        </div>
      )}
    </div>
  );
}
