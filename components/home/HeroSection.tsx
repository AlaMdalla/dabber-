import SearchBar from "@/components/home/SearchBar";
import { ArrowDown, BellRing, CalendarCheck, MapPin } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#080b12]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-18rem] h-[680px] w-[900px] -translate-x-1/2 rounded-full bg-accent/25 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-24">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/80">
            <MapPin className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            Des offres de location partout en Tunisie
          </span>

          <h1 className="mt-7 max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
            Louez ce qu&apos;il vous faut.
            <span className="block text-accent">Pas besoin de l&apos;acheter.</span>
          </h1>

          <p
            dir="rtl"
            lang="ar"
            className="mt-5 text-xl font-bold text-white/75 sm:text-2xl"
          >
            دبّر اللي تستحقّو.
          </p>

          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
            Matériel photo, événementiel, camping et plus&nbsp;: cherchez près
            de chez vous, choisissez vos dates et envoyez votre demande au
            propriétaire.
          </p>
        </div>

        <div className="mx-auto mt-9 max-w-6xl">
          <SearchBar showSupportingPoints />
        </div>

        <ol className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-3 text-sm text-white/70 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center sm:gap-4">
          <li className="flex items-center justify-center gap-2 sm:justify-start">
            <MapPin className="h-4 w-4 text-accent" aria-hidden="true" />
            Trouvez près de vous
          </li>
          <ArrowDown className="mx-auto hidden h-4 w-4 -rotate-90 text-white/30 sm:block" aria-hidden="true" />
          <li className="flex items-center justify-center gap-2">
            <CalendarCheck className="h-4 w-4 text-accent" aria-hidden="true" />
            Choisissez vos dates
          </li>
          <ArrowDown className="mx-auto hidden h-4 w-4 -rotate-90 text-white/30 sm:block" aria-hidden="true" />
          <li className="flex items-center justify-center gap-2 sm:justify-end">
            <BellRing className="h-4 w-4 text-accent" aria-hidden="true" />
            Suivez la réponse
          </li>
        </ol>
      </div>
    </section>
  );
}
