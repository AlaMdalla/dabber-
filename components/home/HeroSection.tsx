import SearchBar from "@/components/home/SearchBar";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#030712]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-24 lg:px-8 lg:pt-28">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/80">
            Location de matériel partout en Tunisie
          </span>

          <h1 className="mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Trouvez ce qu&apos;il vous faut.
          </h1>

          <p
            dir="rtl"
            lang="ar"
            className="mt-4 text-3xl font-extrabold text-accent sm:text-4xl"
          >
            دبّر اللي تستحقّو.
          </p>

          <p className="mt-5 max-w-xl text-base text-white/70 sm:text-lg">
            Découvrez des produits disponibles à la location auprès de
            professionnels près de chez vous.
          </p>

          <p dir="rtl" lang="ar" className="mt-2 text-base text-white/60">
            كل شي للكراء، في بلاصة وحدة.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-5xl">
          <SearchBar />
        </div>
      </div>
    </section>
  );
}
