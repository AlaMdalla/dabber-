"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ImageOff } from "lucide-react";
import type { ListingWithOwner } from "@/lib/supabase/types";
import { categories } from "@/data/categories";

interface ListingCardProps {
  listing: ListingWithOwner;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const isAvailable = listing.availability === "disponible";
  const [isFavorite, setIsFavorite] = useState(false);
  const categoryName =
    categories.find((category) => category.slug === listing.category_slug)
      ?.name ?? listing.category_slug;
  const posterName = listing.profiles?.full_name ?? "Utilisateur Dabber";

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white transition-shadow hover:shadow-md">
      <button
        type="button"
        aria-pressed={isFavorite}
        aria-label={
          isFavorite
            ? `Retirer ${listing.name} des favoris`
            : `Ajouter ${listing.name} aux favoris`
        }
        onClick={() => setIsFavorite((value) => !value)}
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <Heart
          className={`h-4 w-4 ${isFavorite ? "fill-ink" : ""}`}
          aria-hidden="true"
        />
      </button>

      <Link
        href={`/listings/${listing.slug}`}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <div className="relative aspect-[4/3] w-full bg-subtle">
          {listing.image_url ? (
            <Image
              src={listing.image_url}
              alt={listing.name}
              fill
              loading="lazy"
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted">
              <ImageOff className="h-8 w-8" aria-hidden="true" />
            </div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-white">
            {categoryName}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="text-sm font-semibold text-ink">
            {listing.name}
          </h3>
          <p className="text-xs text-muted">
            {listing.governorate} · {posterName}
          </p>

          <div className="mt-1 flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">
              {listing.price_per_day !== null
                ? `${listing.price_per_day} DT / jour`
                : "Prix sur demande"}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                isAvailable
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {isAvailable ? "Disponible" : "À confirmer"}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
