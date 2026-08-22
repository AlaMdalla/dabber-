import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Listing } from "@/lib/supabase/types";
import ListingForm from "@/components/listings/ListingForm";

export default async function EditListingPage({
  params,
}: PageProps<"/listings/[slug]/edit">) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/listings/${slug}/edit`);
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("slug", slug)
    .single<Listing>();

  if (!listing) {
    notFound();
  }

  if (listing.owner_id !== user.id) {
    redirect(`/listings/${slug}`);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink">
        Modifier l&apos;annonce
      </h1>

      <div className="mt-8 rounded-2xl border border-border bg-white p-6">
        <ListingForm ownerId={user.id} listing={listing} />
      </div>
    </div>
  );
}
