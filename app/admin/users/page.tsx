import Image from "next/image";
import Link from "@/components/i18n/LocalizedLink";
import { User as UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/ui/EmptyState";
import AdminUserActions from "@/components/admin/AdminUserActions";
import type { AdminBanRow, AdminRow, AdminUserRow } from "@/lib/supabase/types";
import { getServerI18n, getLocale } from "@/lib/i18n/server";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminUsersPage({
  searchParams,
}: PageProps<"/admin/users">) {
  const params = await searchParams;
  const query = firstValue(params.q)?.trim();
  const locale = await getLocale();
  const { t } = await getServerI18n();
  const supabase = await createClient();

  let usersQuery = supabase
    .from("profiles")
    .select("id, full_name, avatar_url, email, whatsapp_number, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (query) {
    usersQuery = usersQuery.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);
  }

  const [
    { data: users },
    { data: admins },
    { data: bannedUsers },
    {
      data: { user: currentUser },
    },
  ] = await Promise.all([
    usersQuery.returns<AdminUserRow[]>(),
    supabase.from("admins").select("user_id, created_at").returns<AdminRow[]>(),
    supabase.from("banned_users").select("user_id, banned_by, reason, created_at").returns<AdminBanRow[]>(),
    supabase.auth.getUser(),
  ]);

  const adminIds = new Set((admins ?? []).map((admin) => admin.user_id));
  const bannedIds = new Set((bannedUsers ?? []).map((ban) => ban.user_id));

  return (
    <div>
      <form className="flex max-w-sm">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={t("admin.searchUsers")}
          className="h-11 w-full rounded-xl border border-border px-3.5 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </form>

      {users && users.length > 0 ? (
        <ul className="mt-6 flex flex-col gap-2">
          {users.map((user) => {
            const joinedAt = new Intl.DateTimeFormat(locale, {
              month: "long",
              year: "numeric",
              timeZone: "Africa/Tunis",
            }).format(new Date(user.created_at));

            const userIsAdmin = adminIds.has(user.id);
            const userIsBanned = bannedIds.has(user.id);

            return (
              <li
                key={user.id}
                className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4"
              >
                <Link
                  href={`/profiles/${user.id}`}
                  className="flex min-w-0 flex-1 items-center gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-subtle text-muted">
                    {user.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt=""
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : (
                      <UserIcon className="h-4 w-4" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-semibold text-ink">
                      {user.full_name ?? t("listing.dabberUser")}
                      {userIsAdmin && (
                        <span className="shrink-0 rounded-full bg-accent/30 px-2 py-0.5 text-[11px] font-medium text-ink">
                          {t("admin.adminBadge")}
                        </span>
                      )}
                      {userIsBanned && (
                        <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                          {t("admin.bannedBadge")}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {user.email ?? user.whatsapp_number ?? "—"}
                    </p>
                  </div>
                  <p className="hidden shrink-0 text-xs text-muted sm:block">
                    {t("profile.memberSince", { date: joinedAt })}
                  </p>
                </Link>
                <AdminUserActions
                  userId={user.id}
                  isAdmin={userIsAdmin}
                  isBanned={userIsBanned}
                  isSelf={user.id === currentUser?.id}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-6">
          <EmptyState icon={UserIcon} title={t("admin.noUsers")} description="" />
        </div>
      )}
    </div>
  );
}
