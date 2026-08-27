const questions = [
  {
    question: "Est-ce que la réservation est immédiate ?",
    answer:
      "Non. Vous choisissez vos dates et envoyez une demande. Le propriétaire confirme ou refuse ensuite la réservation, et vous retrouvez sa réponse dans vos notifications et dans « Mes réservations ».",
  },
  {
    question: "Qui fixe le prix, la caution et les conditions ?",
    answer:
      "Chaque propriétaire fixe son prix et confirme directement avec vous les conditions de location, la caution éventuelle et la remise du matériel. Dabber facilite la recherche et la mise en relation.",
  },
  {
    question: "Puis-je annuler une réservation ?",
    answer:
      "Une demande en attente peut être annulée à tout moment. Une réservation déjà confirmée peut être annulée en ligne jusqu’à trois jours avant sa date de début.",
  },
  {
    question: "Puis-je proposer mon propre matériel ?",
    answer:
      "Oui. Créez un compte, publiez votre annonce avec vos photos, votre prix et votre localisation, puis répondez aux demandes depuis le calendrier de l’annonce.",
  },
];

export default function FAQSection() {
  return (
    <section className="border-y border-border bg-[#fffdf5] py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
            Avant de réserver
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Des réponses claires, avant votre demande.
          </h2>
          <p className="mt-4 max-w-md text-base leading-7 text-muted">
            Dabber organise la recherche et les demandes. Les détails pratiques
            de la location restent confirmés directement entre utilisateurs.
          </p>
        </div>

        <div className="divide-y divide-border border-y border-border">
          {questions.map((item, index) => (
            <details key={item.question} className="group py-1" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                {item.question}
                <span
                  aria-hidden="true"
                  className="text-xl font-normal text-muted transition-transform group-open:rotate-45 motion-reduce:transition-none"
                >
                  +
                </span>
              </summary>
              <p className="max-w-2xl pb-5 pr-10 text-sm leading-6 text-muted">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
