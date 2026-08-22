import Link from "next/link";
import SectionHeader from "@/components/ui/SectionHeader";
import BusinessCard from "@/components/ui/BusinessCard";
import EmptyState from "@/components/ui/EmptyState";
import { businesses } from "@/data/businesses";

export default function FeaturedBusinesses() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader
        title="Boutiques de location"
        description="Découvrez des professionnels de la location en Tunisie."
      />

      {businesses.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {businesses.map((business) => (
            <BusinessCard key={business.slug} business={business} />
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="Aucune boutique disponible"
            description="De nouveaux professionnels rejoignent Dabber régulièrement."
          />
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/boutiques"
          className="text-sm font-semibold text-ink underline underline-offset-4 hover:text-ink/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
        >
          Voir toutes les boutiques
        </Link>
      </div>
    </section>
  );
}
