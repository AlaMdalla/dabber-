import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-ink text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <span className="text-xl font-extrabold tracking-tight text-white">
              Dabber
            </span>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/60">
              Trouvez du matériel à louer en Tunisie, choisissez vos dates et
              suivez la réponse du propriétaire depuis votre compte.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Explorer</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-white/60">
              <li><Link href="/listings" className="hover:text-white">Toutes les offres</Link></li>
              <li><Link href="/#categories" className="hover:text-white">Catégories</Link></li>
              <li><Link href="/#comment-ca-marche" className="hover:text-white">Comment ça marche</Link></li>
              <li><Link href="/listings/new" className="hover:text-white">Publier mon matériel</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Informations</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-white/60">
              <li><Link href="/login" className="hover:text-white">Se connecter</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Confidentialité</Link></li>
              <li><Link href="/terms" className="hover:text-white">Conditions d&apos;utilisation</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} Dabber. Tous droits réservés.</span>
          <span>La location, sans l’achat inutile.</span>
        </div>
      </div>
    </footer>
  );
}
