import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/i18n/LocalizedLink";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  Hospital,
  ImageOff,
  MapPin,
  MessageCircle,
  Package,
  PackageCheck,
  User as UserIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Profile, StorefrontListing } from "@/lib/supabase/types";
import { getServerI18n } from "@/lib/i18n/server";
import { categories } from "@/data/categories";
import { localizeCategory } from "@/lib/i18n/categories";
import StorefrontFilters from "@/components/profiles/StorefrontFilters";
import AddToRentalButton from "@/components/listings/AddToRentalButton";

export const metadata: Metadata = {
  title: "Profil utilisateur",
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PublicProfilePage({
  params,
  searchParams,
}: PageProps<"/profiles/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const query = firstValue(sp?.query)?.trim();
  const category = firstValue(sp?.category);
  const { locale, t } = await getServerI18n();
  const supabase = await createClient();

  let listingsQuery = supabase
    .from("listings")
    .select(
      "id, slug, name, description, image_url, price_per_day, price_per_week, price_per_month, availability, category_slug, governorate, owner_id, total_quantity, available_quantity",
    )
    .eq("owner_id", id)
    .order("created_at", { ascending: false });

  if (query) {
    listingsQuery = listingsQuery.ilike("name", `%${query}%`);
  }
  if (category) {
    listingsQuery = listingsQuery.eq("category_slug", category);
  }

  const [
    { data: profile },
    { data: listings },
    { data: userData },
    { data: verifiedRow },
    { count: completedRentalsCount },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, whatsapp_number, account_type, created_at")
      .eq("id", id)
      .single<
        Pick<Profile, "id" | "full_name" | "avatar_url" | "whatsapp_number" | "account_type" | "created_at">
      >(),
    listingsQuery.returns<StorefrontListing[]>(),
    supabase.auth.getUser(),
    supabase.from("verified_accounts").select("user_id").eq("user_id", id).maybeSingle(),
    supabase
      .from("rental_requests")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", id)
      .eq("status", "completed"),
  ]);

  if (!profile) {
    notFound();
  }

  const isVerified = Boolean(verifiedRow);

  const isOwnProfile = userData.user?.id === profile.id;
  const displayName = profile.full_name ?? t("listing.dabberUser");
  const joinedAt = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Tunis",
  }).format(new Date(profile.created_at));
  const whatsappNumber = profile.whatsapp_number?.replace(/\D/g, "");
  const whatsappMessage = encodeURIComponent(
    t("messages.profileGreeting"),
  );

  // No dedicated profile location field exists, so use the most common
  // governorate across the owner's own listings as a best-effort signal.
  const locationCounts = new Map<string, number>();
  for (const listing of listings ?? []) {
    locationCounts.set(listing.governorate, (locationCounts.get(listing.governorate) ?? 0) + 1);
  }
  const primaryLocation =
    [...locationCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-border bg-white p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-subtle text-muted">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={displayName}
                fill
                sizes="80px"
                className="object-cover"
              />
            ) : (
              <UserIcon className="h-8 w-8" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 truncate text-2xl font-bold tracking-tight text-ink">
              {displayName}
              {profile.account_type !== "individual" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/30 px-2.5 py-1 text-xs font-medium text-ink">
                  <Hospital className="h-3.5 w-3.5" aria-hidden="true" />
                  {t(profile.account_type === "pharmacy" ? "profile.accountTypePharmacy" : "profile.accountTypeClinic")}
                </span>
              )}
              {isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("profile.verified")}
                </span>
              )}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {t("profile.memberSince", { date: joinedAt })}
              </span>
              {primaryLocation && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {primaryLocation}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Package className="h-4 w-4" aria-hidden="true" />
                {t("storefront.listingCount", { count: listings?.length ?? 0 })}
              </span>
              {Boolean(completedRentalsCount) && (
                <span className="flex items-center gap-1.5">
                  <PackageCheck className="h-4 w-4" aria-hidden="true" />
                  {t("profile.completedRentals", { count: completedRentalsCount ?? 0 })}
                </span>
              )}
            </p>
          </div>
        </div>

        {!isOwnProfile && whatsappNumber && (
          <a
            href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#20bd5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            {t("messages.contactWhatsapp")}
          </a>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">
          {t("profile.listings", { name: displayName })}
        </h2>

        {((listings && listings.length > 0) || query || category) && (
          <div className="mt-4">
            <StorefrontFilters ownerId={id} initialQuery={query} initialCategory={category} />
          </div>
        )}

        {listings && listings.length > 0 ? (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {listings.map((listing) => {
              const isAvailable =
                listing.availability === "disponible" && listing.available_quantity > 0;
              const listingCategory = categories.find((c) => c.slug === listing.category_slug);
              const categoryName = listingCategory
                ? localizeCategory(listingCategory, t).name
                : listing.category_slug;

              return (
                <li
                  key={listing.id}
                  className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-white p-4"
                >
                  <Link
                    href={`/listings/${listing.slug}`}
                    className="flex gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-subtle text-muted">
                      {listing.image_url ? (
                        <Image
                          src={listing.image_url}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <ImageOff className="h-5 w-5" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="inline-flex rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium text-white">
                        {categoryName}
                      </span>
                      <p className="mt-1.5 truncate text-sm font-semibold text-ink">
                        {listing.name}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        {listing.governorate}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-sm font-medium text-ink">
                          {listing.price_per_day !== null
                            ? t("common.priceDay", { price: listing.price_per_day })
                            : t("common.priceRequest")}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            isAvailable
                              ? "bg-green-100 text-green-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isAvailable ? t("common.available") : t("common.toConfirm")}
                        </span>
                      </div>
                    </div>
                  </Link>

                  {!isOwnProfile &&
                    (userData.user ? (
                      <AddToRentalButton
                        listingId={listing.id}
                        listingSlug={listing.slug}
                        listingName={listing.name}
                        listingImageUrl={listing.image_url}
                        unitPrice={listing.price_per_day}
                        weeklyPrice={listing.price_per_week}
                        monthlyPrice={listing.price_per_month}
                        availableQuantity={listing.available_quantity}
                        ownerId={listing.owner_id}
                        ownerName={displayName}
                      />
                    ) : (
                      <Link
                        href={`/login?next=/profiles/${id}`}
                        className="flex h-10 items-center justify-center rounded-xl border border-border text-xs font-semibold text-ink hover:bg-subtle"
                      >
                        {t("cart.loginToRent")}
                      </Link>
                    ))}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-6 rounded-2xl border border-border bg-subtle p-6 text-sm text-muted">
            {query || category ? t("storefront.noResults") : t("profile.noListings")}
          </p>
        )}
      </section>
    </div>
  );
}
