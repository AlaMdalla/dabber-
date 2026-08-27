import { getServerI18n } from "@/lib/i18n/server";

export default async function FAQSection() {
  const { t } = await getServerI18n();
  const questions = [1, 2, 3, 4, 5].map((number) => ({
    question: t(`home.faq.${number}.q` as "home.faq.1.q"),
    answer: t(`home.faq.${number}.a` as "home.faq.1.a"),
  }));

  return (
    <section className="border-y border-border bg-[#fffdf5] py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
            {t("home.faq.eyebrow")}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {t("home.faq.title")}
          </h2>
          <p className="mt-4 max-w-md text-base leading-7 text-muted">
            {t("home.faq.description")}
          </p>
        </div>

        <div className="divide-y divide-border border-y border-border">
          {questions.map((item, index) => (
            <details key={item.question} className="group py-1" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-start font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                {item.question}
                <span
                  aria-hidden="true"
                  className="text-xl font-normal text-muted transition-transform group-open:rotate-45 motion-reduce:transition-none"
                >
                  +
                </span>
              </summary>
              <p className="max-w-2xl pb-5 pe-10 text-sm leading-6 text-muted">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
