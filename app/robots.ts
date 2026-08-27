import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

// Every real route is locale-prefixed (/fr/account, /ar/account, /en/account
// — see proxy.ts), so a bare "/account" rule would no longer match anything.
// The "/*/" wildcard covers all three locale prefixes in one rule.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/*/account",
        "/*/messages",
        "/*/messages/",
        "/*/notifications",
        "/*/reservations",
        "/*/auth/",
        "/auth/callback",
        "/*/listings/new",
        "/*/listings/*/edit",
        "/*/login",
        "/*/reset-password",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
