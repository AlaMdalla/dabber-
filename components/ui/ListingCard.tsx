"use client";

import Link from "@/components/i18n/LocalizedLink";
import Image from "next/image";
import { ArrowUpRight, ImageOff, MapPin } from "lucide-react";
import type { ListingCardData } from "@/lib/supabase/types";
import { categories } from "@/data/categories";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { localizeCategory } from "@/lib/i18n/categories";

interface ListingCardProps {
  listing: ListingCardData;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const { t } = useI18n();
  const isAvailable = listing.availability === "disponible";
  const category =
    categories.find((item) => item.slug === listing.category_slug);
  const categoryName = category
    ? localizeCategory(category, t).name
    : listing.category_slug;
  const posterName = listing.profiles?.full_name ?? t("listing.dabberUser");

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white transition-all hover:-translate-y-1 hover:shadow-lg motion-reduce:transform-none">
      <Link
        href={`/listings/${listing.slug}`}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <div className="relative aspect-[4/3] w-full bg-subtle">
          {listing.image_url ? (
            <Image
              src={listing.image_url}
              alt={t("listing.cardAlt", { name: listing.name, location: listing.governorate })}
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
          <span className="absolute start-3 top-3 rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-white">
            {categoryName}
          </span>
          <span className="absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="text-sm font-semibold text-ink">
            {listing.name}
          </h3>
          <p className="flex items-center gap-1 text-xs text-muted">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {listing.governorate} · {posterName}
          </p>

          <div className="mt-1 flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">
              {listing.price_per_day !== null
                ? t("common.priceDay", { price: listing.price_per_day })
                : t("common.priceRequest")}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
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
    </div>
  );
}
