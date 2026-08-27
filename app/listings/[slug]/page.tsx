import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/i18n/LocalizedLink";
import { notFound } from "next/navigation";
import { MapPin, User as UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { ListingCommentWithAuthor, ListingWithOwner } from "@/lib/supabase/types";
import { categories } from "@/data/categories";
import { SITE_URL } from "@/lib/constants";
import { headers } from "next/headers";
import DeleteListingButton from "@/components/listings/DeleteListingButton";
import AvailabilityToggle from "@/components/listings/AvailabilityToggle";
import ShareToFacebookButton from "@/components/listings/ShareToFacebookButton";
import AvailabilityCalendar from "@/components/listings/AvailabilityCalendar";
import ListingGallery from "@/components/listings/ListingGallery";
import StartConversationForm from "@/components/messages/StartConversationForm";
import ListingComments from "@/components/listings/ListingComments";
import { getServerI18n, getLocale } from "@/lib/i18n/server";
import { locales, defaultLocale, localizePath } from "@/lib/i18n/config";
import { localizeCategory } from "@/lib/i18n/categories";

const getListing = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("*, profiles(full_name, avatar_url, whatsapp_number), listing_images(*)")
    .eq("slug", slug)
    .single<ListingWithOwner>();
  return listing;
});

export async function generateMetadata({
  params,
}: PageProps<"/listings/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const { t } = await getServerI18n();
  const listing = await getListing(slug);

  if (!listing) {
    return {};
  }

  const category = categories.find((item) => item.slug === listing.category_slug);
  const categoryName = category ? localizeCategory(category, t).name : listing.category_slug;
  const title = t("listing.metaTitle", { name: listing.name, location: listing.governorate });
  const description =
    listing.description?.slice(0, 160) ??
    t("listing.metaDescriptionFallback", {
      name: listing.name,
      category: categoryName,
      location: listing.governorate,
    });
  const url = `${SITE_URL}${localizePath(`/listings/${listing.slug}`, locale)}`;

  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[loc] = `${SITE_URL}${localizePath(`/listings/${listing.slug}`, loc)}`;
  }
  languages["x-default"] = `${SITE_URL}${localizePath(`/listings/${listing.slug}`, defaultLocale)}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      locale: locale === "fr" ? "fr_FR" : locale === "ar" ? "ar_TN" : "en_US",
      images: listing.image_url ? [{ url: listing.image_url }] : undefined,
    },
  };
}

export default async function ListingDetailPage({
  params,
}: PageProps<"/listings/[slug]">) {
  const { slug } = await params;
  const { locale, t } = await getServerI18n();
  const [listing, { data: userData }] = await Promise.all([
    getListing(slug),
    (await createClient()).auth.getUser(),
  ]);

  if (!listing) {
    notFound();
  }

  const { data: comments } = await (await createClient())
    .from("listing_comments")
    .select("*, profiles(full_name, avatar_url)")
    .eq("listing_id", listing.id)
    .order("created_at", { ascending: true })
    .returns<ListingCommentWithAuthor[]>();

  const isAvailable = listing.availability === "disponible";
  const isOwner = userData.user?.id === listing.owner_id;
  const category = categories.find((item) => item.slug === listing.category_slug);
  const categoryName = category ? localizeCategory(category, t).name : listing.category_slug;
  const posterName = listing.profiles?.full_name ?? t("listing.dabberUser");
  const galleryImages = [...(listing.listing_images ?? [])].sort(
    (a, b) => a.position - b.position,
  );

  if (galleryImages.length === 0 && listing.image_url) {
    galleryImages.push({
      id: `cover-${listing.id}`,
      listing_id: listing.id,
      image_url: listing.image_url,
      storage_path: null,
      position: 0,
      created_at: listing.created_at,
    });
  }

  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const listingUrl = `${protocol}://${host}${localizePath(`/listings/${listing.slug}`, locale)}`;

  const listingsIndexUrl = `${protocol}://${host}${localizePath("/listings", locale)}`;
  const homeUrl = `${protocol}://${host}${localizePath("/", locale)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.name,
    description: listing.description ?? undefined,
    image: listing.image_url ?? undefined,
    category: categoryName,
    offers: {
      "@type": "Offer",
      url: listingUrl,
      priceCurrency: "TND",
      price: listing.price_per_day ?? undefined,
      // Marks this as a rental offer (not a sale) per GoodRelations, which
      // schema.org's Offer.businessFunction reuses for this exact purpose.
      businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
      availability:
        listing.availability === "disponible"
          ? "https://schema.org/InStock"
          : "https://schema.org/LimitedAvailability",
      areaServed: listing.governorate,
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("breadcrumb.home"), item: homeUrl },
      { "@type": "ListItem", position: 2, name: listing.governorate, item: `${listingsIndexUrl}?location=${encodeURIComponent(listing.governorate)}` },
      { "@type": "ListItem", position: 3, name: categoryName, item: `${listingsIndexUrl}?category=${encodeURIComponent(listing.category_slug)}` },
      { "@type": "ListItem", position: 4, name: listing.name, item: listingUrl },
    ],
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        // JSON.stringify does not escape "<", so a listing name/description
        // containing "</script>" would otherwise break out of this tag and
        // execute as HTML. Escaping "<" to a unicode sequence keeps the JSON
        // valid while preventing that injection.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <ListingGallery
            images={galleryImages}
            listingName={listing.name}
            location={listing.governorate}
          />

          {listing.description && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-ink">{t("listing.description")}</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-muted">
                {listing.description}
              </p>
            </div>
          )}
        </div>

        <div>
          <span className="inline-flex rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-white">
            {categoryName}
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink">
            {listing.name}
          </h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {listing.governorate}
          </p>

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-white p-4">
            <span className="text-lg font-semibold text-ink">
              {listing.price_per_day !== null
                ? t("common.priceDay", { price: listing.price_per_day })
                : t("common.priceRequest")}
            </span>
            {isOwner ? (
              <AvailabilityToggle listingId={listing.id} availability={listing.availability} />
            ) : (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  isAvailable
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {isAvailable ? t("common.available") : t("common.toConfirm")}
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-white p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-subtle text-muted">
              {listing.profiles?.avatar_url ? (
                <Image
                  src={listing.profiles.avatar_url}
                  alt=""
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserIcon className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <div>
              <p className="text-xs text-muted">{t("listing.publishedBy")}</p>
              <p className="text-sm font-semibold text-ink">{posterName}</p>
            </div>
          </div>

          {isOwner && (
            <div className="mt-4 flex gap-3">
              <Link
                href={`/listings/${listing.slug}/edit`}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-center text-sm font-medium text-ink transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                {t("common.edit")}
              </Link>
              <DeleteListingButton listingId={listing.id} />
            </div>
          )}

          <div className="mt-4">
            <AvailabilityCalendar
              listingId={listing.id}
              listingSlug={listing.slug}
              isOwner={isOwner}
              currentUserId={userData.user?.id ?? null}
            />
          </div>

          {!isOwner && (
            <div className="mt-4">
              <StartConversationForm
                listingId={listing.id}
                listingSlug={listing.slug}
                listingName={listing.name}
                listingPricePerDay={listing.price_per_day}
                listingUrl={listingUrl}
                sellerId={listing.owner_id}
                sellerName={posterName}
                sellerWhatsapp={listing.profiles?.whatsapp_number ?? null}
                currentUserId={userData.user?.id ?? null}
              />
            </div>
          )}

          <div className="mt-4">
            <ShareToFacebookButton
              name={listing.name}
              pricePerDay={listing.price_per_day}
              governorate={listing.governorate}
              url={listingUrl}
            />
          </div>
        </div>

      </div>

      <ListingComments
        listingId={listing.id}
        initialComments={comments ?? []}
        currentUserId={userData.user?.id ?? null}
      />
    </div>
  );
}
