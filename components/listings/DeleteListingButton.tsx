"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errorMessage";

interface DeleteListingButtonProps {
  listingId: string;
}

export default function DeleteListingButton({
  listingId,
}: DeleteListingButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Supprimer définitivement cette annonce ?")) return;

    setIsDeleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", listingId);

    if (error) {
      console.error("[DeleteListingButton] delete failed:", error);
      setIsDeleting(false);
      window.alert(`La suppression a échoué : ${describeError(error)}`);
      return;
    }

    router.push("/account");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 disabled:opacity-60"
    >
      {isDeleting ? "Suppression…" : "Supprimer"}
    </button>
  );
}
