import type { Metadata } from "next";
import EmailAuthForm from "@/components/auth/EmailAuthForm";

export const metadata: Metadata = {
  title: "Se connecter",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const nextParam = params.next;
  const requestedNext = (Array.isArray(nextParam) ? nextParam[0] : nextParam) ?? "/";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/";

  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-20">
      <div className="w-full rounded-2xl border border-border bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-ink">Se connecter</h1>
        <p className="mt-2 text-sm text-muted">
          Connectez-vous à Dabber pour gérer vos annonces et vos demandes.
        </p>

        <EmailAuthForm next={next} />
      </div>
    </div>
  );
}
