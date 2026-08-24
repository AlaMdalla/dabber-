"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errorMessage";
import type { Profile } from "@/lib/supabase/types";

interface ProfileFormProps {
  profile: Profile;
}

export default function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState(profile.whatsapp_number ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("idle");
    setErrorMessage(null);

    const normalizedWhatsapp = whatsappNumber.replace(/[\s()-]/g, "");
    if (normalizedWhatsapp && !/^\+[1-9]\d{7,14}$/.test(normalizedWhatsapp)) {
      setIsSaving(false);
      setErrorMessage("Utilisez le format international, par exemple +21620123456.");
      setStatus("error");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        whatsapp_number: normalizedWhatsapp || null,
      })
      .eq("id", profile.id);

    setIsSaving(false);
    if (error) {
      console.error("[ProfileForm] update failed:", error);
      setErrorMessage(describeError(error));
      setStatus("error");
    } else {
      setStatus("saved");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="full_name" className="text-xs font-semibold text-ink">
          Nom affiché
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Votre nom"
          className="h-12 rounded-xl border border-border px-3.5 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="whatsapp_number" className="text-xs font-semibold text-ink">
          Numéro WhatsApp
        </label>
        <input
          id="whatsapp_number"
          name="whatsapp_number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={whatsappNumber}
          onChange={(event) => setWhatsappNumber(event.target.value)}
          placeholder="+21620123456"
          aria-describedby="whatsapp-help"
          className="h-12 rounded-xl border border-border px-3.5 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        <p id="whatsapp-help" className="text-xs text-muted">
          Format international. Ce numéro sera visible sur vos annonces.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {isSaving ? "Enregistrement…" : "Enregistrer"}
        </button>
        {status === "saved" && (
          <span className="text-sm font-medium text-green-700">
            Profil mis à jour.
          </span>
        )}
        {status === "error" && (
          <span className="text-sm font-medium text-red-600">
            {errorMessage}
          </span>
        )}
      </div>
    </form>
  );
}
