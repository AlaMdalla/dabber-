"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Bell, CalendarDays, Menu, MessageCircle, ShieldCheck, User as UserIcon, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import Link from "@/components/i18n/LocalizedLink";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

const navLinks = [
  { label: "nav.find", href: "/listings" },
  { label: "nav.categories", href: "/#categories" },
  { label: "nav.how", href: "/#comment-ca-marche" },
  { label: "nav.why", href: "/#confiance" },
] satisfies { label: TranslationKey; href: string }[];

export default function Header() {
  const { t } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{
    full_name: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setUnreadCount(0);
        setNotificationUnreadCount(0);
        setProfile(null);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    supabase.rpc("is_admin").then(({ data }) => setIsAdmin(Boolean(data)));
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();

    async function refreshProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user!.id)
        .single();

      setProfile(data ?? null);
    }

    void refreshProfile();

    const handleProfileUpdated = () => void refreshProfile();
    window.addEventListener("dabber:profile-updated", handleProfileUpdated);

    return () => {
      window.removeEventListener("dabber:profile-updated", handleProfileUpdated);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();

    async function refreshNotificationCount() {
      const { count } = await supabase
        .from("reservation_notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user!.id)
        .is("read_at", null);
      setNotificationUnreadCount(count ?? 0);
    }

    void refreshNotificationCount();

    const channel = supabase
      .channel(`reservation-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reservation_notifications",
          filter: `recipient_id=eq.${user.id}`,
        },
        () => void refreshNotificationCount(),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void refreshNotificationCount();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(`[Header] reservation notification channel: ${status}`);
        }
      });

    const handleNotificationsRead = () => void refreshNotificationCount();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshNotificationCount();
      }
    };
    const refreshInterval = window.setInterval(
      () => void refreshNotificationCount(),
      15_000,
    );
    window.addEventListener("dabber:notifications-read", handleNotificationsRead);
    window.addEventListener("focus", handleNotificationsRead);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener("dabber:notifications-read", handleNotificationsRead);
      window.removeEventListener("focus", handleNotificationsRead);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();

    async function refreshUnreadCount() {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user!.id)
        .is("read_at", null);

      setUnreadCount(count ?? 0);
    }

    void refreshUnreadCount();

    const channel = supabase
      .channel(`message-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${user.id}`,
        },
        () => setUnreadCount((count) => count + 1),
      )
      .subscribe();

    const handleMessagesRead = () => void refreshUnreadCount();
    window.addEventListener("dabber:messages-read", handleMessagesRead);

    return () => {
      window.removeEventListener("dabber:messages-read", handleMessagesRead);
      void supabase.removeChannel(channel);
    };
  }, [user]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsMenuOpen(false);
  }

  const avatarUrl = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null;
  const displayName =
    profile?.full_name ?? user?.user_metadata?.full_name ?? t("nav.account");

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[4.5rem] max-w-[90rem] items-center gap-5 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 rounded-md text-xl font-extrabold tracking-tight text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Dabber
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-4 overflow-hidden xl:flex" aria-label={t("nav.main")}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-sm font-medium text-ink transition-colors hover:text-ink/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-md"
            >
              {t(link.label)}
            </Link>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-3 xl:flex">
          {user ? (
            <>
              <div className="flex items-center gap-0.5 rounded-xl border border-border bg-subtle/70 p-1">
                <Link
                  href="/notifications"
                  aria-label={
                    notificationUnreadCount > 0
                      ? t("nav.unreadNotifications", { count: notificationUnreadCount })
                      : t("nav.notifications")
                  }
                  className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                >
                  <Bell className="h-5 w-5" aria-hidden="true" />
                  {notificationUnreadCount > 0 && (
                    <span className="absolute -end-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                      {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/reservations"
                  aria-label={t("nav.reservations")}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-ink transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                >
                  <CalendarDays className="h-5 w-5" aria-hidden="true" />
                </Link>
                <Link
                  href="/messages"
                  aria-label={unreadCount > 0 ? t("nav.unreadMessages", { count: unreadCount }) : t("nav.messages")}
                  className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                >
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span className="absolute -end-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    aria-label={t("nav.admin")}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-ink transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                  >
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  </Link>
                )}
              </div>
              <Link
                href="/account"
                className="flex min-w-0 max-w-[9rem] items-center gap-2 rounded-md border-s border-border ps-3 text-sm font-medium text-ink transition-colors hover:text-ink/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                <span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-subtle text-muted">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt=""
                      fill
                      sizes="28px"
                      className="object-cover"
                    />
                  ) : (
                    <UserIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </span>
                <span className="truncate">{displayName}</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="shrink-0 whitespace-nowrap rounded-md px-1 py-2 text-sm font-medium text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="whitespace-nowrap rounded-md px-1 py-2 text-sm font-medium text-ink transition-colors hover:text-ink/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {t("nav.login")}
            </Link>
          )}
          <div className="border-s border-border ps-3">
            <LanguageSwitcher compact />
          </div>
          <Link
            href="/listings/new"
            className="shrink-0 whitespace-nowrap rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {t("nav.publish")}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          aria-label={isMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 xl:hidden"
        >
          {isMenuOpen ? (
            <X className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Menu className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
      </div>

      {isMenuOpen && (
        <nav
          id="mobile-menu"
          aria-label={t("nav.mobile")}
          className="border-t border-border bg-white px-4 py-4 xl:hidden"
        >
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block rounded-xl px-3 py-3 text-sm font-medium text-ink hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {t(link.label)}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
            {user ? (
              <>
                <Link
                  href="/notifications"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-xl px-3 py-3 text-center text-sm font-medium text-ink hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {t("nav.notifications")}
                  {notificationUnreadCount > 0
                    ? ` (${notificationUnreadCount})`
                    : ""}
                </Link>
                <Link
                  href="/reservations"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-xl px-3 py-3 text-center text-sm font-medium text-ink hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {t("nav.reservations")}
                </Link>
                <Link
                  href="/messages"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-xl px-3 py-3 text-center text-sm font-medium text-ink hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {t("nav.messages")}{unreadCount > 0 ? ` (${unreadCount})` : ""}
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="rounded-xl px-3 py-3 text-center text-sm font-medium text-ink hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {t("nav.admin")}
                  </Link>
                )}
                <Link
                  href="/account"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-xl px-3 py-3 text-center text-sm font-medium text-ink hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {displayName}
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-xl px-3 py-3 text-center text-sm font-medium text-muted hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsMenuOpen(false)}
                className="rounded-xl px-3 py-3 text-center text-sm font-medium text-ink hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {t("nav.login")}
              </Link>
            )}
            <Link
              href="/listings/new"
              onClick={() => setIsMenuOpen(false)}
              className="rounded-xl bg-accent px-3 py-3 text-center text-sm font-semibold text-ink hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {t("nav.publish")}
            </Link>
            <div className="flex justify-center pt-2">
              <LanguageSwitcher />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
