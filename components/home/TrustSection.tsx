import { Building2, MapPinned, CalendarCheck, MessageCircle } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";

const points = [
  {
    icon: Building2,
    text: "Identité de la boutique affichée clairement",
  },
  {
    icon: MapPinned,
    text: "Localisation et coordonnées de contact",
  },
  {
    icon: CalendarCheck,
    text: "Demande de disponibilité par date",
  },
  {
    icon: MessageCircle,
    text: "Communication directe avec le professionnel",
  },
];

export default function TrustSection() {
  return (
    <section className="bg-subtle py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader title="Louer plus simplement, avec les bonnes informations." />

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {points.map((point) => (
            <div
              key={point.text}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-subtle text-ink">
                <point.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="text-sm font-medium text-ink">{point.text}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 max-w-2xl text-sm text-muted">
          Dabber facilite la mise en relation. Les prix, disponibilités,
          cautions et conditions sont confirmés par chaque professionnel.
        </p>
      </div>
    </section>
  );
}
