"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
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

  async function handleGroupShare() {
    setPreparing(true);
    setCopyError(false);

    // Reserve the tab synchronously so the browser does not block it after the
    // clipboard promise resolves. The copied URL makes Facebook build the full
    // product card from the listing's Open Graph metadata when it is pasted.
    const groupTab = window.open("about:blank", "_blank");
    let didCopy = false;

    try {
      await copyCaption();
      didCopy = true;
    } catch {
      setCopyError(true);
    } finally {
      // Opening the group must not depend on clipboard permission. Browsers
      // embedded inside social apps commonly block both clipboard APIs.
      if (groupTab) {
        groupTab.opener = null;
        groupTab.location.replace(FACEBOOK_GROUP_URL);
      } else if (didCopy) {
        window.location.assign(FACEBOOK_GROUP_URL);
      }
      setPreparing(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <h3 className="text-sm font-semibold text-ink">
        {t("share.title")}
      </h3>
      <ol className="mt-3 list-decimal space-y-1 ps-4 text-xs text-muted">
        <li>{t("share.stepCopy")}</li>
        <li>{t("share.stepPaste")}</li>
        <li>{t("share.stepPublish")}</li>
      </ol>

      {copyError && (
        <div className="mt-3 rounded-xl border border-border bg-subtle p-3">
          <label className="block text-xs font-semibold text-ink" htmlFor="facebook-caption">
            {t("share.copy")}
          </label>
          <p className="mt-1 text-xs text-muted">
            {t("share.stepPaste")}
          </p>
          <textarea
            id="facebook-caption"
            readOnly
            value={caption}
            onFocus={(event) => event.currentTarget.select()}
            className="mt-2 min-h-24 w-full resize-y rounded-xl border border-border bg-white p-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <a
            href={FACEBOOK_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex text-xs font-semibold text-[#1877F2] underline-offset-2 hover:underline"
          >
            {t("share.group")}
          </a>
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={handleGroupShare}
          disabled={preparing}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1877F2] text-sm font-semibold text-white transition-colors hover:bg-[#166FE0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {preparing ? t("share.preparing") : copied ? t("share.copied") : t("share.group")}
        </button>
      </div>
    </div>
  );
}
