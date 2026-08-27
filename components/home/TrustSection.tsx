import { UserRound, MapPinned, CalendarCheck, MessageCircle } from "lucide-react";

const points = [
  {
    icon: UserRound,
    title: "Vous savez à qui vous parlez",
    text: "Le profil du propriétaire accompagne chaque annonce.",
  },
  {
    icon: MapPinned,
    title: "Vous cherchez au bon endroit",
    text: "Chaque offre indique son gouvernorat pour éviter les recherches inutiles.",
  },
  {
    icon: CalendarCheck,
    title: "Vos dates sont au centre",
    text: "Le calendrier distingue les périodes libres, demandées et confirmées.",
  },
  {
    icon: MessageCircle,
    title: "La réponse reste visible",
    text: "Notifications, statut de réservation et messagerie restent accessibles dans votre compte.",
  },
];

export default function TrustSection() {
  return (
    <section id="confiance" className="bg-ink py-16 text-white sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.35fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Moins d’incertitude</p>
            <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
              Les informations utiles avant de vous déplacer.
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-white/65 lg:justify-self-end">
            Dabber ne remplace pas l’accord entre utilisateurs. La plateforme
            vous aide à trouver, demander et suivre une location avec un historique clair.
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
