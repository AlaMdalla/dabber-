import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  Profile,
  RentalHandoverWithPhotos,
  RentalRequestWithItems,
  RentalReturn,
} from "@/lib/supabase/types";
import RentalRecordView from "@/components/rentals/RentalRecordView";

export const metadata: Metadata = {
  title: "Résumé de la location",
  robots: { index: false, follow: false },
};

export default async function RentalRecordPage({ params }: PageProps<"/rentals/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/rentals/${id}`);
  }

  const { data: rental } = await supabase
    .from("rental_requests")
    .select(
      "*, rental_request_items(*), renter:profiles!rental_requests_renter_id_fkey(full_name, avatar_url, whatsapp_number), owner:profiles!rental_requests_owner_id_fkey(full_name, avatar_url, whatsapp_number)",
    )
    .eq("id", id)
    .single<
      RentalRequestWithItems & {
        renter: Pick<Profile, "full_name" | "avatar_url" | "whatsapp_number"> | null;
        owner: Pick<Profile, "full_name" | "avatar_url" | "whatsapp_number"> | null;
      }
    >();

  if (!rental || (rental.renter_id !== user.id && rental.owner_id !== user.id)) {
    notFound();
  }

  const [{ data: handover }, { data: rentalReturn }, { count: medicalItemCount }] = await Promise.all([
    supabase
      .from("rental_handovers")
      .select("*, rental_handover_photos(*)")
      .eq("rental_request_id", id)
      .maybeSingle<RentalHandoverWithPhotos>(),
    supabase
      .from("rental_returns")
      .select("*")
      .eq("rental_request_id", id)
      .maybeSingle<RentalReturn>(),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("category_slug", "materiel-medical")
      .in("id", rental.rental_request_items.map((item) => item.listing_id)),
  ]);
  const isMedicalRental = (medicalItemCount ?? 0) > 0;

  let photoUrls: Record<string, string> = {};
  const photoPaths = handover?.rental_handover_photos.map((photo) => photo.storage_path) ?? [];
  if (photoPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("rental-condition-images")
      .createSignedUrls(photoPaths, 3600);
    if (signed) {
      photoUrls = Object.fromEntries(
        signed
          .filter((entry): entry is typeof entry & { signedUrl: string } => Boolean(entry.signedUrl && entry.path))
          .map((entry) => [entry.path as string, entry.signedUrl]),
      );
    }
  }

  return (
    <RentalRecordView
      rental={rental}
      currentUserId={user.id}
      renterProfile={rental.renter}
      ownerProfile={rental.owner}
      initialHandover={handover ?? null}
      initialHandoverPhotoUrls={photoUrls}
      initialReturn={rentalReturn ?? null}
      isMedicalRental={isMedicalRental}
    />
  );
}
