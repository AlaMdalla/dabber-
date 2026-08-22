"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { governorates } from "@/data/governorates";

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (startDate && endDate && endDate < startDate) {
      setError("La date de fin ne peut pas être antérieure à la date de début.");
      return;
    }

    setError(null);

    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    if (location) params.set("location", location);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    router.push(`/listings?${params.toString()}`);
  }

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-5 lg:grid-cols-[2fr_1.4fr_1fr_1fr_auto] lg:items-end lg:gap-3"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="query" className="text-xs font-semibold text-ink">
            Que cherchez-vous ?
          </label>
          <input
            id="query"
            name="query"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Caméra, tente, vidéoprojecteur…"
            className="h-12 rounded-xl border border-border px-3.5 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="location" className="text-xs font-semibold text-ink">
            Où ?
          </label>
          <select
            id="location"
            name="location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="h-12 rounded-xl border border-border bg-white px-3.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="">Choisir un gouvernorat</option>
            {governorates.map((gov) => (
              <option key={gov} value={gov}>
                {gov}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="startDate" className="text-xs font-semibold text-ink">
            Du
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="h-12 rounded-xl border border-border px-3.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="endDate" className="text-xs font-semibold text-ink">
            Au
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="h-12 rounded-xl border border-border px-3.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>

        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:col-span-2 lg:col-span-1 lg:w-auto"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Rechercher
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

      <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-white/80 sm:justify-start">
        <li>Professionnels locaux</li>
        <li className="hidden sm:inline">·</li>
        <li>Disponibilités vérifiables</li>
        <li className="hidden sm:inline">·</li>
        <li>Contact direct</li>
      </ul>
    </div>
  );
}
