import type { Metadata } from "next";
import SectionHeader from "@/components/ui/SectionHeader";
import ListingCard from "@/components/ui/ListingCard";
import EmptyState from "@/components/ui/EmptyState";
import SearchBar from "@/components/home/SearchBar";
import { createClient } from "@/lib/supabase/server";
import type { ListingCardData } from "@/lib/supabase/types";
import { getServerI18n, getLocale } from "@/lib/i18n/server";
import { getReputationMap } from "@/lib/reviews";
import { locales, defaultLocale, localizePath, type Locale } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { t } = await getServerI18n();

  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[loc] = `${SITE_URL}${localizePath("/listings", loc)}`;
  }
  languages["x-default"] = `${SITE_URL}${localizePath("/listings", defaultLocale)}`;

  return {
    title: t("meta.listings.title"),
    description: t("meta.listings.description"),
    alternates: {
      canonical: `${SITE_URL}${localizePath("/listings", locale)}`,
      languages,
    },
  };
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatSearchDate(isoDate: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

export default async function ListingsPage({
  searchParams,
}: PageProps<"/listings">) {
  const params = await searchParams;
  const { locale, t } = await getServerI18n();
  const query = firstValue(params.query)?.trim();
  const location = firstValue(params.location);
  const category = firstValue(params.category);
  const startDate = firstValue(params.startDate);
  const endDate = firstValue(params.endDate);
  const rangeStart = startDate || endDate;
  const rangeEnd = endDate || startDate;

  const supabase = await createClient();
  let listingsQuery = supabase
    .from("listings")
    .select(
      "id, owner_id, slug, name, image_url, price_per_day, availability, total_quantity, available_quantity, governorate, category_slug, profiles(full_name)"
    )
    .order("created_at", { ascending: false });

  if (query) {
    listingsQuery = listingsQuery.ilike("name", `%${query}%`);
  }
  if (location) {
    listingsQuery = listingsQuery.eq("governorate", location);
  }
  if (category) {
    listingsQuery = listingsQuery.eq("category_slug", category);
  }

  if (rangeStart && rangeEnd && rangeEnd >= rangeStart) {
    const { data: conflicts } = await supabase
      .from("listing_availability")
      .select("listing_id")
      .eq("status", "confirmed")
      .lte("start_date", rangeEnd)
      .gte("end_date", rangeStart)
      .returns<Array<{ listing_id: string }>>();
    const unavailableIds = [...new Set((conflicts ?? []).map((item) => item.listing_id))];

    if (unavailableIds.length > 0) {
      listingsQuery = listingsQuery.not("id", "in", `(${unavailableIds.join(",")})`);
    }
  }

  const { data: listings } = await listingsQuery.returns<ListingCardData[]>();

  const reputationMap = await getReputationMap(supabase, (listings ?? []).map((listing) => listing.owner_id));
  for (const listing of listings ?? []) {
    listing.reputation = reputationMap.get(listing.owner_id) ?? null;
  }

  return (
    <div className="bg-subtle">
      <section className="border-b border-border bg-ink py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{t("listings.explore")}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t("listings.hero")}
          </h1>
          <div className="mt-6">
            <SearchBar
              initialQuery={query}
              initialLocation={location}
              initialStartDate={startDate}
              initialEndDate={endDate}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeader
          title={query ? t("listings.results", { query }) : t("listings.all")}
          description={
            rangeStart && rangeEnd
              ? t("listings.range", { start: formatSearchDate(rangeStart, locale), end: formatSearchDate(rangeEnd, locale) })
              : t("listings.browse")
          }
        />

        {listings && listings.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="mt-8">
            <EmptyState
              title={t("listings.empty")}
              description={t("listings.emptyDescription")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
