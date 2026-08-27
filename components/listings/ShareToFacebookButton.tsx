"use client";

import { useState } from "react";
import { Copy, ExternalLink, Share2 } from "lucide-react";
import { FACEBOOK_GROUP_URL } from "@/lib/constants";
import { useI18n } from "@/components/i18n/LocaleProvider";

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
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const priceText =
    pricePerDay !== null ? t("common.priceDay", { price: pricePerDay }) : t("common.priceRequest");
  const caption = t("share.caption", { name, price: priceText, location: governorate, url });

  function handleShare() {
    const sharerUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(sharerUrl, "_blank", "noopener,noreferrer,width=600,height=640");
  }

  async function copyCaption() {
    await navigator.clipboard.writeText(caption);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopy() {
    await copyCaption();
  }

  function handleGroupShare() {
    window.open(FACEBOOK_GROUP_URL, "_blank", "noopener,noreferrer");
    void copyCaption();
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <h3 className="text-sm font-semibold text-ink">
        {t("share.title")}
      </h3>
      <p className="mt-1 text-xs text-muted">
        {t("share.description")}
      </p>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleShare}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1877F2] text-sm font-semibold text-white transition-colors hover:bg-[#166FE0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          {t("share.facebook")}
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium text-ink transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
          {copied ? t("share.copied") : t("share.copy")}
        </button>

        <button
          type="button"
          onClick={handleGroupShare}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium text-ink transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {copied ? t("share.copied") : t("share.group")}
        </button>
      </div>
    </div>
  );
}
