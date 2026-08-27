import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Dabber — Trouvez du matériel à louer en Tunisie",
    template: `%s — ${SITE_NAME}`,
  },
  description:
    "Louez du matériel près de chez vous en Tunisie. Consultez les disponibilités, choisissez vos dates et suivez votre demande sur Dabber.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Dabber — Trouvez du matériel à louer en Tunisie",
    description:
      "Trouvez du matériel à louer en Tunisie, choisissez vos dates et envoyez votre demande au propriétaire.",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "fr_FR",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
