"use client";

import { useI18n } from "@/components/i18n/LocaleProvider";
import FacebookIcon from "@/components/share/FacebookIcon";

interface FacebookShareButtonProps {
  /** Canonical, publicly reachable URL of the page being shared. */
  url: string;
  /** Used for the button's accessible label, not sent to Facebook — the
   * sharer dialog builds its preview from the target URL's Open Graph tags. */
  title?: string;
  className?: string;
}

export default function FacebookShareButton({ url, title, className }: FacebookShareButtonProps) {
  const { t } = useI18n();

  function handleClick() {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    // Opened synchronously from the click handler, with no work before it,
    // so browsers don't treat it as an unsolicited popup and block it.
    window.open(
      shareUrl,
      "facebook-share-dialog",
      "width=700,height=600,resizable=yes,scrollbars=yes",
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={title ? t("share.facebookLabel", { title }) : t("share.title")}
      className={
        className ??
        "flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-ink transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      }
    >
      <FacebookIcon className="h-4 w-4 text-[#1877F2]" />
      {t("share.title")}
    </button>
  );
}
