"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n/config";
import {
  getDictionary,
  translate,
  type Dictionary,
  type TranslationKey,
} from "@/lib/i18n/dictionaries";

interface LocaleContextValue {
  locale: Locale;
  dictionary: Dictionary;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export default function LocaleProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  const [activeLocale, setActiveLocale] = useState(locale);
  const activeDictionary =
    activeLocale === locale ? dictionary : getDictionary(activeLocale);

  function changeLocale(nextLocale: Locale) {
    setActiveLocale(nextLocale);
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
  }

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale: activeLocale,
      dictionary: activeDictionary,
      setLocale: changeLocale,
      t: (key, values) => translate(activeDictionary, key, values),
    }),
    [activeDictionary, activeLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useI18n must be used inside LocaleProvider");
  }
  return context;
}
