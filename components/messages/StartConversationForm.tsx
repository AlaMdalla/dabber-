"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errorMessage";

interface StartConversationFormProps {
  listingId: string;
  listingSlug: string;
  listingName: string;
  listingPricePerDay: number | null;
  listingUrl: string;
  sellerId: string;
  sellerName: string;
  sellerWhatsapp?: string | null;
  currentUserId: string | null;
}

export default function StartConversationForm({
  listingId,
  listingSlug,
  listingName,
  listingPricePerDay,
  listingUrl,
  sellerId,
  sellerName,
  sellerWhatsapp,
  currentUserId,
}: StartConversationFormProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSendWhatsapp() {
    const trimmed = body.trim();
    if (!trimmed || !sellerWhatsapp) return;

    const priceLabel =
      listingPricePerDay !== null ? `${listingPricePerDay} DT / jour` : "Prix sur demande";
    const productInfo = [
      `📦 ${listingName}`,
      `💰 ${priceLabel}`,
      `🔗 ${listingUrl}`,
    ].join("\n");
    const fullMessage = `${trimmed}\n\n${productInfo}`;

    const digits = sellerWhatsapp.replace(/\D/g, "");
    window.open(
      `https://wa.me/${digits}?text=${encodeURIComponent(fullMessage)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

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
      const { data: conversationId, error: startError } = await supabase.rpc(
        "start_conversation",
        {
          p_other_user_id: sellerId,
          p_body: trimmed,
          p_listing_id: listingId,
        },
      );

      if (startError) throw startError;

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
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={isSending || !body.trim()}
            className="h-11 flex-1 rounded-xl bg-accent px-5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {isSending ? "Envoi…" : "Envoyer le message"}
          </button>
          {sellerWhatsapp && (
            <button
              type="button"
              onClick={handleSendWhatsapp}
              disabled={!body.trim()}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#20bd5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 disabled:opacity-60"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Envoyer via WhatsApp
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
