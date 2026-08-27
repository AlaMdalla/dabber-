import type { Metadata } from "next";
import SectionHeader from "@/components/ui/SectionHeader";
import ListingCard from "@/components/ui/ListingCard";
import EmptyState from "@/components/ui/EmptyState";
import SearchBar from "@/components/home/SearchBar";
import { createClient } from "@/lib/supabase/server";
import type { ListingCardData } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Toutes les annonces de location",
  description:
    "Parcourez toutes les annonces de matériel et équipements à louer en Tunisie : audiovisuel, événementiel, camping, mode et plus.",
  alternates: {
    canonical: "/listings",
  },
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatSearchDate(isoDate: string) {
  return new Intl.DateTimeFormat("fr-FR", {
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
      "id, slug, name, image_url, price_per_day, availability, governorate, category_slug, profiles(full_name)"
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

  return (
    <div className="bg-subtle">
      <section className="border-b border-border bg-ink py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Explorer Dabber</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Trouvez l’offre qui correspond à votre besoin.
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
          title={query ? `Résultats pour « ${query} »` : "Toutes les offres"}
          description={
            rangeStart && rangeEnd
              ? `Offres sans réservation confirmée du ${formatSearchDate(rangeStart)} au ${formatSearchDate(rangeEnd)}.`
              : "Parcourez les produits proposés à la location."
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
              title="Aucune annonce trouvée"
              description="Modifiez vos dates, votre région ou votre recherche pour voir d’autres offres."
            />
          </div>
        )}
      </div>
    </div>
  );
}
