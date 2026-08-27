import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  ImageOff,
  MapPin,
  MessageCircle,
  User as UserIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { ListingSummary, Profile } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Profil utilisateur",
};

export default async function PublicProfilePage({
  params,
}: PageProps<"/profiles/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: profile }, { data: listings }, { data: userData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, whatsapp_number, created_at")
      .eq("id", id)
      .single<
        Pick<Profile, "id" | "full_name" | "avatar_url" | "whatsapp_number" | "created_at">
      >(),
    supabase
      .from("listings")
      .select("id, slug, name, image_url, price_per_day, governorate")
      .eq("owner_id", id)
      .order("created_at", { ascending: false })
      .returns<ListingSummary[]>(),
    supabase.auth.getUser(),
  ]);

  if (!profile) {
    notFound();
  }

  const isOwnProfile = userData.user?.id === profile.id;
  const displayName = profile.full_name ?? "Utilisateur Dabber";
  const joinedAt = new Intl.DateTimeFormat("fr-TN", {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Tunis",
  }).format(new Date(profile.created_at));
  const whatsappNumber = profile.whatsapp_number?.replace(/\D/g, "");
  const whatsappMessage = encodeURIComponent(
    `Bonjour, je vous contacte depuis votre profil Dabber.`,
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-border bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-subtle text-muted">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={displayName}
                fill
                sizes="80px"
                className="object-cover"
              />
            ) : (
              <UserIcon className="h-8 w-8" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight text-ink">
              {displayName}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Membre depuis {joinedAt}
            </p>
          </div>
        </div>

        {!isOwnProfile && whatsappNumber && (
          <a
            href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#20bd5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            Contacter sur WhatsApp
          </a>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink">
          Annonces de {displayName}
        </h2>

        {listings && listings.length > 0 ? (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {listings.map((listing) => (
              <li key={listing.id}>
                <Link
                  href={`/listings/${listing.slug}`}
                  className="flex h-full gap-4 rounded-2xl border border-border bg-white p-4 transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-subtle text-muted">
                    {listing.image_url ? (
                      <Image
                        src={listing.image_url}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <ImageOff className="h-5 w-5" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {listing.name}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {listing.governorate}
                    </p>
                    <p className="mt-2 text-sm font-medium text-ink">
                      {listing.price_per_day !== null
                        ? `${listing.price_per_day} DT / jour`
                        : "Prix sur demande"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-2xl border border-border bg-subtle p-6 text-sm text-muted">
            Cet utilisateur n&apos;a aucune annonce active.
          </p>
        )}
      </section>
    </div>
  );
}
