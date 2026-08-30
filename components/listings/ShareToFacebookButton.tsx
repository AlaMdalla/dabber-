"use client";

import { useState } from "react";
import { ExternalLink, Share2 } from "lucide-react";
import { useI18n } from "@/components/i18n/LocaleProvider";
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
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const priceText =
    pricePerDay !== null ? t("common.priceDay", { price: pricePerDay }) : t("common.priceRequest");
  const caption = t("share.caption", { name, price: priceText, location: governorate, url });

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
    } catch {
      // Clipboard access can be denied by browser privacy settings. Keep a
      // user-initiated fallback for older browsers and embedded webviews.
      const textarea = document.createElement("textarea");
      textarea.value = caption;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const didCopy = document.execCommand("copy");
      textarea.remove();

      if (!didCopy) {
        throw new Error("Clipboard unavailable");
      }
    }

    setCopied(true);
    setCopyError(false);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function handleFacebookShare() {
    // The listing's Open Graph metadata supplies Facebook with its title,
    // description, image and URL. Facebook then lets the person choose the
    // Dabber group and publish from their signed-in profile.
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=680,height=720");
  }

  async function handleGroupShare() {
    setPreparing(true);
    setCopyError(false);

    // Reserve the tab synchronously so the browser does not block it after the
    // clipboard promise resolves. The copied URL makes Facebook build the full
    // product card from the listing's Open Graph metadata when it is pasted.
    const groupTab = window.open("about:blank", "_blank");

    try {
      await copyCaption();
      if (groupTab) {
        groupTab.opener = null;
        groupTab.location.replace(FACEBOOK_GROUP_URL);
      } else {
        window.location.assign(FACEBOOK_GROUP_URL);
      }
    } catch {
      groupTab?.close();
      setCopyError(true);
    } finally {
      setPreparing(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <h3 className="text-sm font-semibold text-ink">
        {t("share.title")}
      </h3>
      <p className="mt-1 text-xs text-muted">
        {t("share.description")}
      </p>

      <ol className="mt-3 list-decimal space-y-1 ps-4 text-xs text-muted">
        <li>{t("share.stepCopy")}</li>
        <li>{t("share.stepPaste")}</li>
        <li>{t("share.stepPublish")}</li>
      </ol>

      {copyError && (
        <p className="mt-3 text-xs font-medium text-red-600" role="alert">
          {t("share.copyFailed")}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleGroupShare}
          disabled={preparing}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1877F2] text-sm font-semibold text-white transition-colors hover:bg-[#166FE0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {preparing ? t("share.preparing") : copied ? t("share.copied") : t("share.group")}
        </button>

        <button
          type="button"
          onClick={handleFacebookShare}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium text-ink transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          {t("share.facebook")}
        </button>
      </div>
    </div>
  );
}
