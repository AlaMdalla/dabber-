import Link from "next/link";
import SectionHeader from "@/components/ui/SectionHeader";
import ListingCard from "@/components/ui/ListingCard";
import EmptyState from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import type { ListingCardData } from "@/lib/supabase/types";

export default async function FeaturedListings() {
  const supabase = await createClient();
  const { data: listings } = await supabase
    .from("listings")
    .select(
      "id, slug, name, image_url, price_per_day, availability, governorate, category_slug, profiles(full_name)"
    )
    .order("created_at", { ascending: false })
    .limit(8)
    .returns<ListingCardData[]>();

  return (
    <section className="border-y border-border bg-subtle py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Les dernières offres près de chez vous"
          description="Parcourez les annonces récemment publiées et consultez leurs disponibilités."
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
                  Avant d’envoyer votre demande
                </p>
                <h3 className="mt-3 text-2xl font-bold tracking-tight text-ink">
                  L’essentiel est visible dans chaque annonce.
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
                  Prix par jour, localisation, profil du propriétaire et
                  calendrier vous aident à vérifier si l’offre correspond à
                  votre besoin avant de prendre contact.
                </p>
              </div>
            )}
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
            Explorer toutes les offres
          </Link>
        </div>
      </div>
    </section>
  );
}
