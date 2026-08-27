import { headers } from "next/headers";
import {
  defaultLocale,
  isLocale,
  localeHeaderName,
  type Locale,
} from "@/lib/i18n/config";
import { getDictionary, translate } from "@/lib/i18n/dictionaries";

export async function getLocale(): Promise<Locale> {
  const value = (await headers()).get(localeHeaderName) ?? undefined;
  return isLocale(value) ? value : defaultLocale;
}

export async function getServerI18n() {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  return {
    locale,
    dictionary,
    t: (key: Parameters<typeof translate>[1], values?: Parameters<typeof translate>[2]) =>
      translate(dictionary, key, values),
  };
}
