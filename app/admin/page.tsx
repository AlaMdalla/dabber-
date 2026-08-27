import Link from "@/components/i18n/LocalizedLink";
import { CalendarDays, Package, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getServerI18n } from "@/lib/i18n/server";

export default async function AdminOverviewPage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();

  const [{ count: userCount }, { count: listingCount }, { count: reservationCount }] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("listings").select("id", { count: "exact", head: true }),
      supabase.from("reservations").select("id", { count: "exact", head: true }),
    ]);

  const stats = [
    { label: t("admin.totalUsers"), value: userCount ?? 0, href: "/admin/users", icon: Users },
    { label: t("admin.totalListings"), value: listingCount ?? 0, href: "/admin/listings", icon: Package },
    { label: t("admin.totalReservations"), value: reservationCount ?? 0, href: "/admin/reservations", icon: CalendarDays },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <Link
          key={stat.href}
          href={stat.href}
          className="rounded-2xl border border-border bg-white p-5 transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <stat.icon className="h-5 w-5 text-muted" aria-hidden="true" />
          <p className="mt-3 text-2xl font-bold text-ink">{stat.value}</p>
          <p className="mt-1 text-sm text-muted">{stat.label}</p>
        </Link>
      ))}
    </div>
  );
}
