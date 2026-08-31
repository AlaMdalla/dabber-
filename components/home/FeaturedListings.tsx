import Link from "@/components/i18n/LocalizedLink";
import SectionHeader from "@/components/ui/SectionHeader";
import ListingCard from "@/components/ui/ListingCard";
import EmptyState from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import type { ListingCardData } from "@/lib/supabase/types";
import { getServerI18n } from "@/lib/i18n/server";
import { getReputationMap } from "@/lib/reviews";

export default async function FeaturedListings() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const { data: listings } = await supabase
    .from("listings")
    .select(
      "id, owner_id, slug, name, image_url, price_per_day, availability, total_quantity, available_quantity, governorate, category_slug, profiles(full_name)"
    )
    .order("created_at", { ascending: false })
    .limit(8)
    .returns<ListingCardData[]>();

  const reputationMap = await getReputationMap(supabase, (listings ?? []).map((listing) => listing.owner_id));
  for (const listing of listings ?? []) {
    listing.reputation = reputationMap.get(listing.owner_id) ?? null;
  }

  return (
    <section className="border-y border-border bg-subtle py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={t("home.featured.title")}
          description={t("home.featured.description")}
        />

        {listings && listings.length > 0 ? (
          <div
            className={
              listings.length === 1
                ? "mt-8 grid gap-6 lg:grid-cols-[minmax(0,20rem)_1fr] lg:items-stretch"
                : "mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
            }
          >
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
            {listings.length === 1 && (
              <div className="flex flex-col justify-center border-y border-border px-1 py-8 lg:px-10">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                  {t("home.featured.before")}
                </p>
                <h3 className="mt-3 text-2xl font-bold tracking-tight text-ink">
                  {t("home.featured.essentials")}
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
                  {t("home.featured.details")}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-8">
            <EmptyState
              title={t("home.featured.emptyTitle")}
              description={t("home.featured.emptyDescription")}
            />
          </div>
        )}

        <div className="mt-8 flex justify-center sm:justify-start">
          <Link
            href="/listings"
            className="rounded-xl border border-border bg-white px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {t("home.featured.explore")}
          </Link>
        </div>
      </div>
    </section>
  );
}
