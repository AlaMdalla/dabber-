import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="text-xl font-semibold text-ink">
        La connexion a échoué
      </h1>
      <p className="mt-2 text-sm text-muted">
        Une erreur est survenue pendant la connexion avec Facebook. Veuillez
        réessayer.
      </p>
      <Link
        href="/login"
        className="mt-6 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        Réessayer
      </Link>
    </div>
  );
}
