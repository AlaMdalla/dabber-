import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageOff, MapPin, User as UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { ListingWithOwner } from "@/lib/supabase/types";
import { categories } from "@/data/categories";
import { headers } from "next/headers";
import DeleteListingButton from "@/components/listings/DeleteListingButton";
import ShareToFacebookButton from "@/components/listings/ShareToFacebookButton";
import StartConversationForm from "@/components/messages/StartConversationForm";

export default async function ListingDetailPage({
  params,
}: PageProps<"/listings/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();

  const [{ data: listing }, { data: userData }] = await Promise.all([
    supabase
      .from("listings")
      .select("*, profiles(full_name, avatar_url)")
      .eq("slug", slug)
      .single<ListingWithOwner>(),
    supabase.auth.getUser(),
  ]);

  if (!listing) {
    notFound();
  }

  const isAvailable = listing.availability === "disponible";
  const isOwner = userData.user?.id === listing.owner_id;
  const categoryName =
    categories.find((category) => category.slug === listing.category_slug)
      ?.name ?? listing.category_slug;
  const posterName = listing.profiles?.full_name ?? "Utilisateur Dabber";

  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const listingUrl = `${protocol}://${host}/listings/${listing.slug}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-subtle">
            {listing.image_url ? (
              <Image
                src={listing.image_url}
                alt={listing.name}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted">
                <ImageOff className="h-10 w-10" aria-hidden="true" />
              </div>
            )}
          </div>

          {listing.description && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-ink">Description</h2>
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
                ? `${listing.price_per_day} DT / jour`
                : "Prix sur demande"}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                isAvailable
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {isAvailable ? "Disponible" : "À confirmer"}
            </span>
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
              <p className="text-xs text-muted">Publié par</p>
              <p className="text-sm font-semibold text-ink">{posterName}</p>
            </div>
          </div>

          {isOwner && (
            <div className="mt-4 flex gap-3">
              <Link
                href={`/listings/${listing.slug}/edit`}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-center text-sm font-medium text-ink transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                Modifier
              </Link>
              <DeleteListingButton listingId={listing.id} />
            </div>
          )}

          {!isOwner && (
            <div className="mt-4">
              <StartConversationForm
                listingId={listing.id}
                listingSlug={listing.slug}
                sellerId={listing.owner_id}
                sellerName={posterName}
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
    </div>
  );
}
