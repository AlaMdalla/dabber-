import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, MapPin } from "lucide-react";
import type { Business } from "@/data/businesses";

interface BusinessCardProps {
  business: Business;
}

export default function BusinessCard({ business }: BusinessCardProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-white p-6 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-subtle">
          <Image
            src={business.image}
            alt={`Logo de ${business.name}`}
            fill
            loading="lazy"
            sizes="56px"
            className="object-contain p-2"
          />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-ink">
              {business.name}
            </h3>
            {business.verified && (
              <BadgeCheck
                className="h-4 w-4 text-ink"
                aria-label="Boutique vérifiée"
              />
            )}
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {business.location}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted">
        <span>{business.category}</span>
        <span>{business.listingCount} produits</span>
      </div>

      <Link
        href={`/boutiques/${business.slug}`}
        className="mt-4 inline-flex items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        Voir la boutique
      </Link>
    </div>
  );
}
