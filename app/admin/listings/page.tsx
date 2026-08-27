import Link from "@/components/i18n/LocalizedLink";
import { Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/ui/EmptyState";
import AdminDeleteListingButton from "@/components/admin/AdminDeleteListingButton";
import type { AdminListingRow } from "@/lib/supabase/types";
import { getServerI18n } from "@/lib/i18n/server";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminListingsPage({
  searchParams,
}: PageProps<"/admin/listings">) {
  const params = await searchParams;
  const query = firstValue(params.q)?.trim();
  const { t } = await getServerI18n();
  const supabase = await createClient();

  let listingsQuery = supabase
    .from("listings")
    .select(
      "id, slug, name, governorate, category_slug, price_per_day, availability, created_at, profiles(full_name)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (query) {
    listingsQuery = listingsQuery.ilike("name", `%${query}%`);
  }

  const { data: listings } = await listingsQuery.returns<AdminListingRow[]>();

  return (
    <div>
      <form className="flex max-w-sm">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={t("admin.searchListings")}
          className="h-11 w-full rounded-xl border border-border px-3.5 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </form>

      {listings && listings.length > 0 ? (
        <ul className="mt-6 flex flex-col gap-2">
          {listings.map((listing) => (
            <li
              key={listing.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/listings/${listing.slug}`}
                  className="truncate text-sm font-semibold text-ink hover:underline"
                >
                  {listing.name}
                </Link>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {t("admin.owner")}: {listing.profiles?.full_name ?? t("listing.dabberUser")} ·{" "}
                  {listing.governorate}
                </p>
              </div>
              <Link
                href={`/listings/${listing.slug}`}
                className="shrink-0 text-sm font-medium text-ink hover:underline"
              >
                {t("admin.viewListing")}
              </Link>
              <AdminDeleteListingButton listingId={listing.id} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6">
          <EmptyState icon={Package} title={t("admin.noListings")} description="" />
        </div>
      )}
    </div>
  );
}
