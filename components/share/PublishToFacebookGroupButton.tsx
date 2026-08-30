"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { DABBER_FACEBOOK_GROUP_URL } from "@/lib/constants";
import { showToast } from "@/lib/toast";
import FacebookIcon from "@/components/share/FacebookIcon";

interface PublishToFacebookGroupButtonProps {
  /** Pre-built, ready-to-paste post text (already localized). */
  postText: string;
  className?: string;
}

export default function PublishToFacebookGroupButton({
  postText,
  className,
}: PublishToFacebookGroupButtonProps) {
  const { t } = useI18n();
  const [preparing, setPreparing] = useState(false);

  async function handleClick() {
    if (!DABBER_FACEBOOK_GROUP_URL) {
      showToast(t("share.groupUrlMissing"));
      return;
    }

    setPreparing(true);

    // Reserve the tab synchronously so the browser does not block it after the
    // clipboard promise resolves. Facebook has no API to open a group's post
    // composer or prefill its text — the group only opens once the text is
    // copied, so the user can paste it themselves.
    const groupTab = window.open("about:blank", "_blank");
    let copied = false;

    try {
      await navigator.clipboard.writeText(postText);
      copied = true;
    } catch {
      copied = false;
    }

    if (groupTab) {
      groupTab.opener = null;
      groupTab.location.replace(DABBER_FACEBOOK_GROUP_URL);
    } else {
      window.location.assign(DABBER_FACEBOOK_GROUP_URL);
    }

    showToast(copied ? t("share.groupCopied") : t("share.groupCopyFailed"));
    setPreparing(false);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={preparing}
      className={
        className ??
        "flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#166FE0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-70"
      }
    >
      <FacebookIcon className="h-4 w-4" />
      {preparing ? t("share.preparing") : t("share.groupCta")}
    </button>
  );
}
