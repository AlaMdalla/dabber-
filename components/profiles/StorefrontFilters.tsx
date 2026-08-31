"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { categories } from "@/data/categories";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { localizePath } from "@/lib/i18n/config";
import { localizeCategory } from "@/lib/i18n/categories";

interface StorefrontFiltersProps {
  ownerId: string;
  initialQuery?: string;
  initialCategory?: string;
}

export default function StorefrontFilters({
  ownerId,
  initialQuery = "",
  initialCategory = "",
}: StorefrontFiltersProps) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);

  function pushFilters(nextQuery: string, nextCategory: string) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("query", nextQuery.trim());
    if (nextCategory) params.set("category", nextCategory);
    const search = params.toString();
    router.push(
      localizePath(search ? `/profiles/${ownerId}?${search}` : `/profiles/${ownerId}`, locale),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pushFilters(query, category);
  }

  function handleCategoryChange(value: string) {
    setCategory(value);
    pushFilters(query, value);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 sm:flex-row sm:items-center"
    >
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("storefront.searchPlaceholder")}
          className="h-11 w-full rounded-xl border border-border ps-9 pe-3 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>
      <select
        value={category}
        onChange={(event) => handleCategoryChange(event.target.value)}
        className="h-11 rounded-xl border border-border bg-white px-3 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <option value="">{t("storefront.allCategories")}</option>
        {categories.map((cat) => (
          <option key={cat.slug} value={cat.slug}>
            {localizeCategory(cat, t).name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        {t("search.submit")}
      </button>
    </form>
  );
}
