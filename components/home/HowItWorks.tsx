import { Search, ClipboardList, MessageSquare } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";

const steps = [
  {
    icon: Search,
    title: "Cherchez",
    description:
      "Indiquez ce que vous cherchez, votre région et les dates souhaitées.",
  },
  {
    icon: ClipboardList,
    title: "Comparez",
    description:
      "Consultez les offres et les professionnels disponibles près de chez vous.",
  },
  {
    icon: MessageSquare,
    title: "Demandez",
    description:
      "Envoyez une demande et confirmez la disponibilité directement avec le professionnel.",
  },
];

export default function HowItWorks() {
  return (
    <section id="comment-ca-marche" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader title="Comment ça marche ?" align="center" />

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="rounded-2xl border border-border bg-white p-6 text-center"
          >
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-subtle text-ink">
              <step.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
              Étape {index + 1}
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
