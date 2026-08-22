import Link from "next/link";
import SectionHeader from "@/components/ui/SectionHeader";
import ListingCard from "@/components/ui/ListingCard";
import EmptyState from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import type { ListingWithOwner } from "@/lib/supabase/types";

export default async function FeaturedListings() {
  const supabase = await createClient();
  const { data: listings } = await supabase
    .from("listings")
    .select("*, profiles(full_name, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(8)
    .returns<ListingWithOwner[]>();

  return (
    <section className="bg-subtle py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Locations populaires"
          description="Quelques équipements recherchés en ce moment."
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
              title="Aucune annonce disponible"
              description="Revenez bientôt : de nouvelles offres de location seront publiées prochainement."
            />
          </div>
        )}

        <div className="mt-8 flex justify-center sm:justify-start">
          <Link
            href="/listings"
            className="rounded-xl border border-border bg-white px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Voir toutes les annonces
          </Link>
        </div>
      </div>
    </section>
  );
}
