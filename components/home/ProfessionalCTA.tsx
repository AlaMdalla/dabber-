import Link from "next/link";

export default function ProfessionalCTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-accent px-6 py-12 sm:px-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Vous proposez des produits à la location ?
          </h2>
          <p className="mt-3 text-base text-ink/80">
            Présentez vos produits, gérez leurs disponibilités et recevez de
            nouvelles demandes depuis une seule plateforme.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/professionals"
              className="w-full rounded-xl bg-ink px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 sm:w-auto"
            >
              Ajouter ma boutique
            </Link>
            <Link
              href="/professionals#how-it-works"
              className="w-full rounded-xl border border-ink/20 px-6 py-3 text-center text-sm font-semibold text-ink transition-colors hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 sm:w-auto"
            >
              Découvrir le fonctionnement
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
