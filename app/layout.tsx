import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
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
  title: "Dabber — Trouvez du matériel à louer en Tunisie",
  description:
    "Trouvez des produits et équipements disponibles à la location auprès de professionnels en Tunisie.",
  openGraph: {
    title: "Dabber — Trouvez du matériel à louer en Tunisie",
    description:
      "Trouvez des produits et équipements disponibles à la location auprès de professionnels en Tunisie.",
    url: "https://dabber.tn",
    siteName: "Dabber",
    locale: "fr_FR",
    type: "website",
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
