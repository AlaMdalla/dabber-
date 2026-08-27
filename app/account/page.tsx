import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ImageOff } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { ListingSummary, Profile } from "@/lib/supabase/types";
import ProfileForm from "@/components/account/ProfileForm";
import SignOutButton from "@/components/account/SignOutButton";

export const metadata: Metadata = {
  title: "Mon compte",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: myListings }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
    supabase
      .from("listings")
      .select("id, slug, name, image_url, price_per_day, governorate")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .returns<ListingSummary[]>(),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink">
        Mon compte
      </h1>

      <div className="mt-8 rounded-2xl border border-border bg-white p-6">
        <p className="text-sm text-muted">{user.email}</p>

        {profile && <ProfileForm profile={profile} />}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Mes annonces</h2>
        <Link
          href="/listings/new"
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          + Ajouter une annonce
        </Link>
      </div>

      {myListings && myListings.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-3">
          {myListings.map((listing) => (
            <li key={listing.id}>
              <Link
                href={`/listings/${listing.slug}`}
                className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-subtle text-muted">
                  {listing.image_url ? (
                    <Image
                      src={listing.image_url}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <ImageOff className="h-5 w-5" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {listing.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {listing.governorate} ·{" "}
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
        <p className="mt-4 text-sm text-muted">
          Vous n&apos;avez publié aucune annonce pour le moment.
        </p>
      )}

      <div className="mt-10">
        <SignOutButton />
      </div>
    </div>
  );
}
