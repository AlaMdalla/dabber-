"use client";

import { Languages } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/components/i18n/LocaleProvider";
import {
  localeCookieName,
  localeNames,
  locales,
  localizePath,
  stripLocaleFromPathname,
  type Locale,
} from "@/lib/i18n/config";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  function changeLocale(nextLocale: Locale) {
    document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    const query = searchParams.toString();
    const path = `${stripLocaleFromPathname(pathname)}${query ? `?${query}` : ""}`;
    router.push(localizePath(path, nextLocale));
  }

  return (
    <label className="relative inline-flex items-center gap-2">
      <span className="sr-only">{t("language.change")}</span>
      <Languages className="pointer-events-none h-4 w-4 text-muted" aria-hidden="true" />
      <select
        value={locale}
        onChange={(event) => changeLocale(event.target.value as Locale)}
        aria-label={t("language.label")}
        className={`rounded-lg border border-border bg-white text-sm font-medium text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${compact ? "h-9 w-16 px-1" : "h-10 px-2"}`}
      >
        {locales.map((item) => (
          <option key={item} value={item}>
            {compact ? item.toUpperCase() : localeNames[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
