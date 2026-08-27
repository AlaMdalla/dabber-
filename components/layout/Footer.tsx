"use client";

import Link from "@/components/i18n/LocalizedLink";
import { useI18n } from "@/components/i18n/LocaleProvider";

export default function Footer() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-ink text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <span className="text-xl font-extrabold tracking-tight text-white">
              Dabber
            </span>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/60">
              {t("footer.description")}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">{t("footer.explore")}</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-white/60">
              <li><Link href="/listings" className="hover:text-white">{t("footer.allListings")}</Link></li>
              <li><Link href="/#categories" className="hover:text-white">{t("nav.categories")}</Link></li>
              <li><Link href="/#comment-ca-marche" className="hover:text-white">{t("nav.how")}</Link></li>
              <li><Link href="/listings/new" className="hover:text-white">{t("nav.publish")}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">{t("footer.information")}</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-white/60">
              <li><Link href="/login" className="hover:text-white">{t("nav.login")}</Link></li>
              <li><Link href="/privacy" className="hover:text-white">{t("footer.privacy")}</Link></li>
              <li><Link href="/terms" className="hover:text-white">{t("footer.terms")}</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <span>{t("footer.rights", { year })}</span>
          <span>{t("footer.tagline")}</span>
        </div>
      </div>
    </footer>
  );
}
