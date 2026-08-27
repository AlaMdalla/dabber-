"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errorMessage";
import { useI18n } from "@/components/i18n/LocaleProvider";

interface AdminDeleteListingButtonProps {
  listingId: string;
}

const LISTING_IMAGES_PUBLIC_PATH = "/storage/v1/object/public/listing-images/";

function getListingImagePath(publicUrl: string) {
  try {
    const url = new URL(publicUrl);
    const markerIndex = url.pathname.indexOf(LISTING_IMAGES_PUBLIC_PATH);
    if (markerIndex === -1) return null;
    return decodeURIComponent(
      url.pathname.slice(markerIndex + LISTING_IMAGES_PUBLIC_PATH.length),
    );
  } catch {
    return null;
  }
}

export default function AdminDeleteListingButton({
  listingId,
}: AdminDeleteListingButtonProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(t("delete.confirm"))) return;

    setIsDeleting(true);
    const supabase = createClient();
    const { data: imageRows } = await supabase
      .from("listing_images")
      .select("storage_path, image_url")
      .eq("listing_id", listingId)
      .returns<Array<{ storage_path: string | null; image_url: string }>>();

    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", listingId);

    if (error) {
      console.error("[AdminDeleteListingButton] delete failed:", error);
      setIsDeleting(false);
      window.alert(t("delete.failed", { error: describeError(error) }));
      return;
    }

    const imagePaths = (imageRows ?? [])
      .map((image) => image.storage_path ?? getListingImagePath(image.image_url))
      .filter((path): path is string => Boolean(path));

    if (imagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("listing-images")
        .remove(imagePaths);
      if (storageError) {
        console.warn("[AdminDeleteListingButton] image cleanup failed:", storageError);
      }
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="shrink-0 rounded-xl border border-red-200 px-3.5 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 disabled:opacity-60"
    >
      {isDeleting ? t("delete.deleting") : t("common.delete")}
    </button>
  );
}
