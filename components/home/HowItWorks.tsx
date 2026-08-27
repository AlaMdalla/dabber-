import { Search, CalendarRange, BellRing } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Cherchez",
    description:
      "Indiquez ce que vous cherchez, votre région et les dates souhaitées.",
  },
  {
    icon: CalendarRange,
    title: "Choisissez vos dates",
    description:
      "Consultez le calendrier de l’annonce et sélectionnez votre période de location.",
  },
  {
    icon: BellRing,
    title: "Recevez la réponse",
    description:
      "Le propriétaire accepte ou refuse. Vous suivez la réponse et votre réservation depuis votre compte.",
  },
];

export default function HowItWorks() {
  return (
    <section id="comment-ca-marche" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Simple par conception</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          De votre besoin à votre demande, en trois étapes.
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
    </section>
  );
}
