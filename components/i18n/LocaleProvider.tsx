"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n/config";
import {
  translate,
  type Dictionary,
  type TranslationKey,
} from "@/lib/i18n/dictionaries";

interface LocaleContextValue {
  locale: Locale;
  dictionary: Dictionary;
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
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dictionary,
      t: (key, values) => translate(dictionary, key, values),
    }),
    [dictionary, locale],
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
