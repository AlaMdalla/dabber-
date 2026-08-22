import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-subtle">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="text-xl font-extrabold tracking-tight text-ink">
              Dabber
            </span>
            <p className="mt-3 max-w-xs text-sm text-muted">
              Dabber rassemble les offres de location en Tunisie pour vous
              aider à trouver plus facilement ce qu&apos;il vous faut.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Link
                href="https://facebook.com"
                aria-label="Dabber sur Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-xs font-semibold text-ink transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                FB
              </Link>
              <Link
                href="https://instagram.com"
                aria-label="Dabber sur Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-xs font-semibold text-ink transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                IG
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">Navigation</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
              <li><Link href="/listings" className="hover:text-ink">Explorer</Link></li>
              <li><Link href="/#categories" className="hover:text-ink">Catégories</Link></li>
              <li><Link href="/#comment-ca-marche" className="hover:text-ink">Comment ça marche</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">Catégories</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
              <li><Link href="/listings?category=audiovisuel" className="hover:text-ink">Audiovisuel</Link></li>
              <li><Link href="/listings?category=evenementiel" className="hover:text-ink">Événementiel</Link></li>
              <li><Link href="/listings?category=camping-loisirs" className="hover:text-ink">Camping et loisirs</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">Professionnels</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
              <li><Link href="/professionals" className="hover:text-ink">Ajouter ma boutique</Link></li>
              <li><Link href="/contact" className="hover:text-ink">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-ink">Politique de confidentialité</Link></li>
              <li><Link href="/terms" className="hover:text-ink">Conditions d&apos;utilisation</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-xs text-muted">
          © {year} Dabber. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
