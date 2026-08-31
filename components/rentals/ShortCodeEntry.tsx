"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

interface ShortCodeEntryProps {
  titleKey: TranslationKey;
  hintKey: TranslationKey;
  submitLabelKey: TranslationKey;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (code: string) => void;
}

/** Shown to whoever is GIVING the item: they type in the code the other side just read out loud. */
export default function ShortCodeEntry({
  titleKey,
  hintKey,
  submitLabelKey,
  isSubmitting,
  error,
  onSubmit,
}: ShortCodeEntryProps) {
  const { t } = useI18n();
  const [code, setCode] = useState("");

  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <p className="text-sm font-semibold text-ink">{t(titleKey)}</p>
      <p className="mt-1 text-xs text-muted">{t(hintKey)}</p>
      <input
        type="text"
        inputMode="numeric"
        maxLength={4}
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
        placeholder="0000"
        className="mt-4 h-14 w-full rounded-xl border border-border bg-subtle text-center text-2xl font-bold tracking-[0.5em] text-ink placeholder:text-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
      <button
        type="button"
        disabled={code.length !== 4 || isSubmitting}
        onClick={() => onSubmit(code)}
        className="mt-4 h-11 w-full rounded-xl bg-accent text-sm font-semibold text-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {t(submitLabelKey)}
      </button>
    </div>
  );
}
