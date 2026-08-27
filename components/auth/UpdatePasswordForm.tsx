"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errorMessage";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { localizePath } from "@/lib/i18n/config";

export default function UpdatePasswordForm() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t("auth.passwordMin"));
      return;
    }
    if (password !== confirmation) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (updateError) {
      setError(describeError(updateError));
      return;
    }

    router.push(localizePath("/account", locale));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="new-password" className="text-xs font-semibold text-ink">
          {t("auth.newPassword")}
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-12 rounded-xl border border-border px-3.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm-password" className="text-xs font-semibold text-ink">
          {t("auth.confirmPassword")}
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          className="h-12 rounded-xl border border-border px-3.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>
      {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="h-12 rounded-xl bg-accent px-5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {isSubmitting ? t("common.saving") : t("auth.savePassword")}
      </button>
    </form>
  );
}
