import Link from "@/components/i18n/LocalizedLink";
import { Camera, CircleDollarSign, Search } from "lucide-react";
import { getServerI18n } from "@/lib/i18n/server";

const PREVIEW_DAYS = [
  { day: 12, status: "green" as const },
  { day: 13, status: "green" as const },
  { day: 14, status: "amber" as const },
  { day: 15, status: "red" as const },
  { day: 16, status: "red" as const },
  { day: 17, status: "green" as const },
  { day: 18, status: "green" as const },
];

const STATUS_CLASSES = {
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
};

function CalendarPreviewCard({ t }: { t: Awaited<ReturnType<typeof getServerI18n>>["t"] }) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
      <p className="text-xs font-semibold text-muted">
        {t("home.calendar.preview")}
      </p>
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {PREVIEW_DAYS.map(({ day, status }) => (
          <span
            key={day}
            className={`flex h-9 items-center justify-center rounded-lg text-xs font-medium ${STATUS_CLASSES[status]}`}
          >
            {day}
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          {t("status.available")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          {t("status.requested")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-400" />
          {t("status.confirmed")}
        </span>
      </div>
    </div>
  );
}

export default async function HeroSection() {
  const { t } = await getServerI18n();
  const ownerPoints = [
    { icon: Camera, text: t("home.hero.pointPhotos") },
    { icon: CircleDollarSign, text: t("home.hero.pointPrice") },
  ];

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

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <div className="text-center lg:text-start">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/80">
              {t("home.hero.badge")}
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
              {t("home.hero.title")}
              <span className="block text-accent">{t("home.hero.highlight")}</span>
            </h1>

            <p
              dir="rtl"
              lang="ar"
              className="mt-5 text-xl font-bold text-white/75 sm:text-2xl"
            >
              {t("home.hero.arabicTagline")}
            </p>

            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/70 sm:text-lg lg:mx-0">
              {t("home.hero.description")}
            </p>

            <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row lg:mx-0">
              <Link
                href="/listings/new"
                className="flex h-12 flex-1 items-center justify-center rounded-xl bg-accent px-6 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                {t("nav.publish")}
              </Link>
              <Link
                href="/listings"
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080b12]"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                {t("home.hero.search")}
              </Link>
            </div>

            <ul className="mx-auto mt-7 flex max-w-md flex-col gap-2.5 text-sm text-white/65 sm:flex-row sm:justify-center sm:gap-6 lg:mx-0 lg:justify-start">
              {ownerPoints.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center justify-center gap-2 sm:justify-start">
                  <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-center lg:justify-end">
            <CalendarPreviewCard t={t} />
          </div>
        </div>
      </div>
    </section>
  );
}
