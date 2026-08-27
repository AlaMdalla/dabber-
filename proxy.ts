import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import {
  detectLocale,
  isLocale,
  localeCookieName,
  localeFromPathname,
  localeHeaderName,
  stripLocaleFromPathname,
} from "@/lib/i18n/config";

const UNLOCALIZED_PATHS = new Set([
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image",
]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/auth/callback") || UNLOCALIZED_PATHS.has(pathname)) {
    return updateSession(request);
  }

  const locale = localeFromPathname(pathname);

  if (!locale) {
    const cookieLocale = request.cookies.get(localeCookieName)?.value;
    const preferredLocale = isLocale(cookieLocale)
      ? cookieLocale
      : detectLocale(request.headers.get("accept-language"));
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname =
      pathname === "/" ? `/${preferredLocale}` : `/${preferredLocale}${pathname}`;

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set(localeCookieName, preferredLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return updateSession(request, response);
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = stripLocaleFromPathname(pathname);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(localeHeaderName, locale);

  const response = NextResponse.rewrite(rewriteUrl, {
    request: { headers: requestHeaders },
  });
  response.cookies.set(localeCookieName, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return updateSession(request, response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
