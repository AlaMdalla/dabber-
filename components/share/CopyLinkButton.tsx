"use client";

import { Copy } from "lucide-react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { showToast } from "@/lib/toast";

interface CopyLinkButtonProps {
  url: string;
  className?: string;
}

export default function CopyLinkButton({ url, className }: CopyLinkButtonProps) {
  const { t } = useI18n();

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(url);
      showToast(t("share.linkCopied"));
    } catch {
      showToast(t("share.linkCopyFailed"));
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ??
        "flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-ink transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      }
    >
      <Copy className="h-4 w-4" aria-hidden="true" />
      {t("share.copyLink")}
    </button>
  );
}
