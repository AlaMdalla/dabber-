import type { Category } from "@/data/categories";

export function localizeCategory(
  category: Category,
  t: (key: string, values?: Record<string, string | number>) => string,
): Category {
  const name = t(`category.${category.slug}.name`);
  const description = t(`category.${category.slug}.description`);
  const noteKey = `category.${category.slug}.note`;
  const note = category.note ? t(noteKey) : undefined;

  return { ...category, name, description, note };
}
