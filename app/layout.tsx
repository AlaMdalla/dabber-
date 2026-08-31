import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import LocaleProvider from "@/components/i18n/LocaleProvider";
import Toaster from "@/components/ui/Toaster";
import MiniCart from "@/components/cart/MiniCart";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { defaultLocale } from "@/lib/i18n/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const title = dictionary["meta.home.title"];
  const description = dictionary["meta.home.description"];

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s — ${SITE_NAME}` },
    description,
    alternates: {
      canonical: `/${locale}`,
      languages: { fr: "/fr", ar: "/ar", en: "/en", "x-default": `/${defaultLocale}` },
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}`,
      siteName: SITE_NAME,
      locale: locale === "fr" ? "fr_FR" : locale === "ar" ? "ar_TN" : "en_US",
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LocaleProvider key={locale} locale={locale} dictionary={dictionary}>
          <Header />
          <main className="flex flex-1 flex-col">{children}</main>
          <Footer />
          <Toaster />
          <MiniCart />
        </LocaleProvider>
      </body>
    </html>
  );
}
