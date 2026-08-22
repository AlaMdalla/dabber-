import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListingForm from "@/components/listings/ListingForm";

export default async function NewListingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/listings/new");
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink">
        Publier une annonce
      </h1>
      <p className="mt-2 text-sm text-muted">
        Décrivez le produit que vous proposez à la location.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-white p-6">
        <ListingForm ownerId={user.id} />
      </div>
    </div>
  );
}
