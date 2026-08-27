import SectionHeader from "@/components/ui/SectionHeader";
import CategoryCard from "@/components/ui/CategoryCard";
import { createClient } from "@/lib/supabase/server";
import { categories } from "@/data/categories";

export default async function CategorySection() {
  const supabase = await createClient();
  const { data: listings } = await supabase.from("listings").select("category_slug");

  const listingCounts = new Map<string, number>();
  for (const listing of listings ?? []) {
    listingCounts.set(
      listing.category_slug,
      (listingCounts.get(listing.category_slug) ?? 0) + 1
    );
  }

  return (
    <section id="categories" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader
        title="Que cherchez-vous ?"
        description="Explorez les principales catégories disponibles à la location."
      />

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <CategoryCard
            key={category.slug}
            category={{
              ...category,
              listingCount: listingCounts.get(category.slug) ?? 0,
            }}
          />
        ))}
      </div>
    </section>
  );
}
