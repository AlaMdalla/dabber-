import { UserRound, MapPinned, CalendarCheck, MessageCircle } from "lucide-react";
import { getServerI18n } from "@/lib/i18n/server";

export default async function TrustSection() {
  const { t } = await getServerI18n();
  const points = [
    { icon: UserRound, title: t("home.trust.1.title"), text: t("home.trust.1.text") },
    { icon: MapPinned, title: t("home.trust.2.title"), text: t("home.trust.2.text") },
    { icon: CalendarCheck, title: t("home.trust.3.title"), text: t("home.trust.3.text") },
    { icon: MessageCircle, title: t("home.trust.4.title"), text: t("home.trust.4.text") },
  ];

  return (
    <section id="confiance" className="bg-ink py-16 text-white sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.35fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{t("home.trust.eyebrow")}</p>
            <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
              {t("home.trust.title")}
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-white/65 lg:justify-self-end">
            {t("home.trust.description")}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden border border-white/15 bg-white/15 sm:grid-cols-2 lg:grid-cols-4">
          {points.map((point) => (
            <div
              key={point.title}
              className="flex flex-col gap-3 bg-ink p-6"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-ink">
                <point.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="text-sm font-semibold text-white">{point.title}</h3>
              <p className="text-sm leading-6 text-white/60">{point.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
