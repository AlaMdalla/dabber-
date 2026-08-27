"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Search } from "lucide-react";
import { governorates } from "@/data/governorates";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { localizePath } from "@/lib/i18n/config";

interface SearchBarProps {
  initialQuery?: string;
  initialLocation?: string;
  initialStartDate?: string;
  initialEndDate?: string;
  showSupportingPoints?: boolean;
}

export default function SearchBar({
  initialQuery = "",
  initialLocation = "",
  initialStartDate = "",
  initialEndDate = "",
  showSupportingPoints = false,
}: SearchBarProps) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [location, setLocation] = useState(initialLocation);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [showDates, setShowDates] = useState(Boolean(initialStartDate || initialEndDate));
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (startDate && endDate && endDate < startDate) {
      setError(t("search.invalidRange"));
      return;
    }

    setError(null);

    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    if (location) params.set("location", location);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    const search = params.toString();
    router.push(localizePath(search ? `/listings?${search}` : "/listings", locale));
  }

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="grid grid-cols-1 gap-3 rounded-2xl border border-white/20 bg-white p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:grid-cols-2 sm:p-5 lg:grid-cols-[2fr_1.35fr_1fr_1fr_auto] lg:items-end"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="query" className="text-xs font-semibold text-ink">
            {t("search.queryLabel")}
          </label>
          <input
            id="query"
            name="query"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("search.queryPlaceholder")}
            className="h-12 rounded-xl border border-border px-3.5 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="location" className="text-xs font-semibold text-ink">
            {t("search.where")}
          </label>
          <select
            id="location"
            name="location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="h-12 rounded-xl border border-border bg-white px-3.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="">{t("search.governorate")}</option>
            {governorates.map((gov) => (
              <option key={gov} value={gov}>
                {gov}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowDates((visible) => !visible)}
          aria-expanded={showDates}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-ink sm:col-span-2 lg:hidden"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          {showDates ? t("search.hideDates") : t("search.addDates")}
        </button>

        <div className={`${showDates ? "grid" : "hidden"} grid-cols-2 gap-3 sm:col-span-2 lg:contents`}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="startDate" className="text-xs font-semibold text-ink">
              {t("search.from")}
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="h-12 min-w-0 rounded-xl border border-border px-3 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="endDate" className="text-xs font-semibold text-ink">
              {t("search.to")}
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              min={startDate || undefined}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="h-12 min-w-0 rounded-xl border border-border px-3 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>
        </div>

        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:col-span-2 lg:col-span-1 lg:w-auto"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          {t("search.submit")}
        </button>

        {error && (
          <p
            role="alert"
            className="sm:col-span-2 lg:col-span-5 text-sm font-medium text-red-600"
          >
            {error}
          </p>
        )}
      </form>

      {showSupportingPoints && (
        <p className="mt-3 text-center text-xs text-white/55">
          {t("search.support")}
        </p>
      )}
    </div>
  );
}
