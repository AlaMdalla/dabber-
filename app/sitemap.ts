import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/constants";
import { locales, defaultLocale } from "@/lib/i18n/config";

function languageAlternates(path: string) {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[locale] = `${SITE_URL}/${locale}${path}`;
  }
  languages["x-default"] = `${SITE_URL}/${defaultLocale}${path}`;
  return languages;
}

// Every route is locale-prefixed, so each path below becomes one sitemap
// entry per locale, cross-referenced via alternates.languages (Next.js
// turns this into the sitemap's <xhtml:link rel="alternate" hreflang="…">
// entries — the sitemap-level equivalent of the hreflang tags on each page).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const { data: listings } = await supabase
    .from("listings")
    .select("slug, updated_at")
    .order("updated_at", { ascending: false });

  const staticPaths: {
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }[] = [
    { path: "", changeFrequency: "daily", priority: 1 },
    { path: "/listings", changeFrequency: "hourly", priority: 0.9 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const { path, changeFrequency, priority } of staticPaths) {
    for (const locale of locales) {
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        changeFrequency,
        priority,
        alternates: { languages: languageAlternates(path) },
      });
    }
  }

  for (const listing of listings ?? []) {
    const path = `/listings/${listing.slug}`;
    for (const locale of locales) {
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        lastModified: listing.updated_at,
        changeFrequency: "weekly",
        priority: 0.7,
        alternates: { languages: languageAlternates(path) },
      });
    }
  }

  return entries;
}
