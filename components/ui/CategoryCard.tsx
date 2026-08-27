"use client";

import Link from "@/components/i18n/LocalizedLink";
import { ArrowRight } from "lucide-react";
import { categories, type Category } from "@/data/categories";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { localizeCategory } from "@/lib/i18n/categories";

interface CategoryCardProps {
  category: Pick<Category, "slug" | "listingCount">;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  const { t } = useI18n();
  const categoryDefinition = categories.find(
    (item) => item.slug === category.slug
  );

  if (!categoryDefinition) {
    return null;
  }

  const translatedCategory = localizeCategory(categoryDefinition, t);
  const Icon = translatedCategory.icon;

  return (
    <Link
      href={`/listings?category=${category.slug}`}
      className="group flex flex-col justify-between border-t border-border bg-white py-5 transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:px-1"
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff4bf] text-ink transition-transform group-hover:-rotate-3 motion-reduce:transition-none">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <ArrowRight
            className="h-4 w-4 text-muted transition-transform group-hover:translate-x-1 group-hover:text-ink"
            aria-hidden="true"
          />
        </div>
        <h3 className="mt-4 text-base font-semibold text-ink">
          {translatedCategory.name}
        </h3>
        <p className="mt-1 text-sm text-muted">{translatedCategory.description}</p>
        {translatedCategory.note && (
          <p className="mt-2 text-xs text-muted italic">{translatedCategory.note}</p>
        )}
      </div>
      <p className="mt-4 text-xs font-medium text-muted">
        {category.listingCount > 0
          ? t("category.count", { count: category.listingCount })
          : t("category.explore")}
      </p>
    </Link>
  );
}
