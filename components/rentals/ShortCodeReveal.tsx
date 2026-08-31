import { useI18n } from "@/components/i18n/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

interface ShortCodeRevealProps {
  code: string;
  titleKey: TranslationKey;
  hintKey: TranslationKey;
}

/** Shown to whoever is RECEIVING the item: they read this code out loud so the other side can type it in. */
export default function ShortCodeReveal({ code, titleKey, hintKey }: ShortCodeRevealProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-white p-6 text-center">
      <p className="text-sm font-semibold text-ink">{t(titleKey)}</p>
      <p className="mt-3 text-4xl font-bold tracking-[0.3em] text-ink">{code}</p>
      <p className="mt-3 text-xs text-muted">{t(hintKey)}</p>
    </div>
  );
}
