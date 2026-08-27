import type { Metadata } from "next";
import Link from "@/components/i18n/LocalizedLink";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerI18n } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const adminNavLinks = [
  { label: "admin.overview", href: "/admin" },
  { label: "admin.users", href: "/admin/users" },
  { label: "admin.listings", href: "/admin/listings" },
  { label: "admin.reservations", href: "/admin/reservations" },
] satisfies { label: TranslationKey; href: string }[];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink">{t("nav.admin")}</h1>
      <p className="mt-2 text-sm text-muted">{t("admin.dashboardDescription")}</p>

      <nav className="mt-6 flex flex-wrap gap-2 border-b border-border pb-4">
        {adminNavLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t(link.label)}
          </Link>
        ))}
      </nav>

      <div className="mt-8">{children}</div>
    </div>
  );
}
