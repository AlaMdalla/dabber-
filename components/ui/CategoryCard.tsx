import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Category } from "@/data/categories";

interface CategoryCardProps {
  category: Category;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  const Icon = category.icon;

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
          {category.name}
        </h3>
        <p className="mt-1 text-sm text-muted">{category.description}</p>
        {category.note && (
          <p className="mt-2 text-xs text-muted italic">{category.note}</p>
        )}
      </div>
      <p className="mt-4 text-xs font-medium text-muted">
        {category.listingCount > 0
          ? `${category.listingCount} annonce${category.listingCount > 1 ? "s" : ""}`
          : "Explorer la catégorie"}
      </p>
    </Link>
  );
}
