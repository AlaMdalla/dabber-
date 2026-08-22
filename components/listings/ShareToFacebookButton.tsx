"use client";

import { useState } from "react";
import { Copy, ExternalLink, Share2 } from "lucide-react";
import { FACEBOOK_GROUP_URL } from "@/lib/constants";

interface ShareToFacebookButtonProps {
  name: string;
  pricePerDay: number | null;
  governorate: string;
  url: string;
}

export default function ShareToFacebookButton({
  name,
  pricePerDay,
  governorate,
  url,
}: ShareToFacebookButtonProps) {
  const [copied, setCopied] = useState(false);

  const priceText =
    pricePerDay !== null ? `${pricePerDay} DT / jour` : "Prix sur demande";
  const caption = `${name} — ${priceText} — ${governorate}\nDisponible sur Dabber : ${url}`;

  function handleShare() {
    const sharerUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(sharerUrl, "_blank", "noopener,noreferrer,width=600,height=640");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <h3 className="text-sm font-semibold text-ink">
        Partager cette annonce
      </h3>
      <p className="mt-1 text-xs text-muted">
        Facebook ne permet pas de publier directement dans un groupe : partagez,
        puis choisissez le groupe dans la fenêtre Facebook, ou copiez le texte
        pour le coller vous-même.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleShare}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1877F2] text-sm font-semibold text-white transition-colors hover:bg-[#166FE0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Partager sur Facebook
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium text-ink transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
          {copied ? "Texte copié !" : "Copier le texte de l'annonce"}
        </button>

        <a
          href={FACEBOOK_GROUP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium text-ink transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Ouvrir notre groupe Facebook
        </a>
      </div>
    </div>
  );
}
