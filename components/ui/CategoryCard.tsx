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
      className="group flex flex-col justify-between rounded-2xl border border-border bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-subtle text-ink group-hover:bg-accent/20">
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
        {category.listingCount} annonces
      </p>
    </Link>
  );
}
