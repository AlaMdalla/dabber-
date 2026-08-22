"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errorMessage";

interface StartConversationFormProps {
  listingId: string;
  listingSlug: string;
  sellerId: string;
  sellerName: string;
  currentUserId: string | null;
}

export default function StartConversationForm({
  listingId,
  listingSlug,
  sellerId,
  sellerName,
  currentUserId,
}: StartConversationFormProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!currentUserId) {
    return (
      <div className="rounded-2xl border border-border bg-white p-5">
        <h3 className="text-sm font-semibold text-ink">
          Contacter {sellerName}
        </h3>
        <p className="mt-1 text-xs text-muted">
          Connectez-vous pour envoyer un message au vendeur.
        </p>
        <Link
          href={`/login?next=/listings/${listingSlug}`}
          className="mt-4 flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    setIsSending(true);
    setError(null);

    const supabase = createClient();

    try {
      const { data: existing, error: findError } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", listingId)
        .eq("buyer_id", currentUserId)
        .maybeSingle<{ id: string }>();

      if (findError) throw findError;

      let conversationId = existing?.id;

      if (!conversationId) {
        const { data: created, error: createError } = await supabase
          .from("conversations")
          .insert({
            listing_id: listingId,
            buyer_id: currentUserId,
            seller_id: sellerId,
          })
          .select("id")
          .single<{ id: string }>();

        if (createError) throw createError;
        conversationId = created.id;
      }

      const { error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          body: trimmed,
        });

      if (messageError) throw messageError;

      router.push(`/messages/${conversationId}`);
    } catch (err) {
      console.error("[StartConversationForm] failed:", err);
      setError(describeError(err));
      setIsSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <h3 className="text-sm font-semibold text-ink">
        Contacter {sellerName}
      </h3>
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
        <textarea
          rows={3}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Bonjour, je suis intéressé(e) par votre annonce…"
          className="rounded-xl border border-border px-3.5 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isSending || !body.trim()}
          className="h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {isSending ? "Envoi…" : "Envoyer le message"}
        </button>
      </form>
    </div>
  );
}
