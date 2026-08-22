import SectionHeader from "@/components/ui/SectionHeader";
import ListingCard from "@/components/ui/ListingCard";
import EmptyState from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import type { ListingWithOwner } from "@/lib/supabase/types";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ListingsPage({
  searchParams,
}: PageProps<"/listings">) {
  const params = await searchParams;
  const query = firstValue(params.query)?.trim();
  const location = firstValue(params.location);
  const category = firstValue(params.category);

  const supabase = await createClient();
  let listingsQuery = supabase
    .from("listings")
    .select("*, profiles(full_name, avatar_url)")
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

  const { data: listings } = await listingsQuery.returns<
    ListingWithOwner[]
  >();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeader
        title="Toutes les annonces"
        description="Parcourez les produits disponibles à la location."
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
            description="Essayez d'autres critères de recherche ou revenez plus tard."
          />
        </div>
      )}
    </div>
  );
}
