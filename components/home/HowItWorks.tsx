import Link from "@/components/i18n/LocalizedLink";
import { ArrowRight, Camera, CalendarCheck, Send } from "lucide-react";
import { getServerI18n } from "@/lib/i18n/server";

export default async function HowItWorks() {
  const { t } = await getServerI18n();
  const steps = [
    { icon: Camera, title: t("home.how.step1.title"), description: t("home.how.step1.description") },
    { icon: Send, title: t("home.how.step2.title"), description: t("home.how.step2.description") },
    { icon: CalendarCheck, title: t("home.how.step3.title"), description: t("home.how.step3.description") },
  ];

  return (
    <section id="comment-ca-marche" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">{t("home.how.eyebrow")}</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {t("home.how.title")}
        </h2>
      </div>

      <div className="relative mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-10">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="relative text-center"
          >
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-[0_0_0_8px_#f9fafb]">
              <step.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
              0{index + 1}
            </p>
            <h3 className="mt-1 text-base font-semibold text-ink">
              {step.title}
            </h3>
            <p className="mt-2 text-sm text-muted">{step.description}</p>
          </div>
        ))}
      </div>

      <p className="mt-12 text-center text-sm text-muted">
        {t("home.how.renterQuestion")}{" "}
        <Link
          href="/listings"
          className="inline-flex items-center gap-1 font-semibold text-ink underline underline-offset-4 hover:text-ink/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
        >
          {t("home.how.viewListings")}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </p>
    </section>
  );
}
