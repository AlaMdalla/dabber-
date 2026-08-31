"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errorMessage";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { AccountType } from "@/lib/supabase/types";

interface AdminUserActionsProps {
  userId: string;
  isAdmin: boolean;
  isBanned: boolean;
  isSelf: boolean;
  accountType: AccountType;
  isVerified: boolean;
}

export default function AdminUserActions({
  userId,
  isAdmin,
  isBanned,
  isSelf,
  accountType,
  isVerified,
}: AdminUserActionsProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [isTogglingAdmin, setIsTogglingAdmin] = useState(false);
  const [isTogglingBan, setIsTogglingBan] = useState(false);
  const [isTogglingVerified, setIsTogglingVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggleAdmin() {
    if (isAdmin && !window.confirm(t("admin.removeAdminConfirm"))) return;

    setIsTogglingAdmin(true);
    setError(null);
    const supabase = createClient();
    const { error: toggleError } = isAdmin
      ? await supabase.from("admins").delete().eq("user_id", userId)
      : await supabase.from("admins").insert({ user_id: userId });

    setIsTogglingAdmin(false);
    if (toggleError) {
      setError(describeError(toggleError));
      return;
    }
    router.refresh();
  }

  async function handleToggleBan() {
    if (!isBanned && !window.confirm(t("admin.banConfirm"))) return;

    setIsTogglingBan(true);
    setError(null);
    const supabase = createClient();
    const { error: toggleError } = isBanned
      ? await supabase.from("banned_users").delete().eq("user_id", userId)
      : await supabase.from("banned_users").insert({ user_id: userId });

    setIsTogglingBan(false);
    if (toggleError) {
      setError(describeError(toggleError));
      return;
    }
    router.refresh();
  }

  async function handleToggleVerified() {
    setIsTogglingVerified(true);
    setError(null);
    const supabase = createClient();
    const { error: toggleError } = isVerified
      ? await supabase.from("verified_accounts").delete().eq("user_id", userId)
      : await supabase.from("verified_accounts").insert({ user_id: userId });

    setIsTogglingVerified(false);
    if (toggleError) {
      setError(describeError(toggleError));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1.5">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleToggleAdmin}
          disabled={isTogglingAdmin || isSelf}
          className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-subtle disabled:opacity-60"
        >
          {isAdmin ? t("admin.removeAdmin") : t("admin.makeAdmin")}
        </button>
        {accountType !== "individual" && (
          <button
            type="button"
            onClick={handleToggleVerified}
            disabled={isTogglingVerified}
            className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-subtle disabled:opacity-60"
          >
            {isVerified ? t("admin.unverify") : t("admin.verify")}
          </button>
        )}
        <button
          type="button"
          onClick={handleToggleBan}
          disabled={isTogglingBan || isSelf || isAdmin}
          className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
        >
          {isBanned ? t("admin.unban") : t("admin.ban")}
        </button>
      </div>
      {error && <p className="max-w-xs text-xs text-red-600">{error}</p>}
    </div>
  );
}
