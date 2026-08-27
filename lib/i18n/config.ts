export const locales = ["fr", "ar", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fr";
export const localeCookieName = "dabber-locale";
export const localeHeaderName = "x-dabber-locale";

export const localeNames: Record<Locale, string> = {
  fr: "Français",
  ar: "العربية",
  en: "English",
};

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}

export function localeFromPathname(pathname: string): Locale | null {
  const segment = pathname.split("/")[1];
  return isLocale(segment) ? segment : null;
}

export function stripLocaleFromPathname(pathname: string) {
  const locale = localeFromPathname(pathname);
  if (!locale) return pathname;

  const stripped = pathname.slice(locale.length + 1);
  return stripped || "/";
}

export function localizePath(path: string, locale: Locale) {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.startsWith("/auth/callback") ||
    path.startsWith("/_next")
  ) {
    return path;
  }

  const [pathAndQuery, hash = ""] = path.split("#", 2);
  const questionMarkIndex = pathAndQuery.indexOf("?");
  const pathname =
    questionMarkIndex === -1
      ? pathAndQuery
      : pathAndQuery.slice(0, questionMarkIndex);
  const query =
    questionMarkIndex === -1 ? "" : pathAndQuery.slice(questionMarkIndex);
  const cleanPathname = stripLocaleFromPathname(pathname || "/");
  const localized =
    cleanPathname === "/" ? `/${locale}` : `/${locale}${cleanPathname}`;

  return `${localized}${query}${hash ? `#${hash}` : ""}`;
}

export function detectLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  const requestedLanguages = acceptLanguage
    .split(",")
    .map((part) => part.trim().split(";")[0]?.toLowerCase())
    .filter(Boolean);

  for (const language of requestedLanguages) {
    const baseLanguage = language?.split("-")[0];
    if (isLocale(baseLanguage)) return baseLanguage;
  }

  return defaultLocale;
}
