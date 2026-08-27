import Link from "next/link";

export default function ProfessionalCTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="relative overflow-hidden rounded-[2rem] bg-accent px-6 py-12 sm:px-12 sm:py-16">
        <div aria-hidden="true" className="absolute -right-16 -top-24 h-72 w-72 rounded-full border-[40px] border-ink/5" />
        <div className="relative max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/60">Côté propriétaire</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Vous avez du matériel qui dort ?
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-ink/75">
            Publiez une annonce avec vos photos et votre prix, puis gérez les
            demandes et les disponibilités depuis un seul calendrier.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/listings/new"
              className="w-full rounded-xl bg-ink px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 sm:w-auto"
            >
              Publier mon matériel
            </Link>
            <Link
              href="/listings"
              className="w-full rounded-xl border border-ink/20 px-6 py-3 text-center text-sm font-semibold text-ink transition-colors hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 sm:w-auto"
            >
              Voir les annonces
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
