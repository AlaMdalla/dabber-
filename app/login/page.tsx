import FacebookLoginButton from "@/components/auth/FacebookLoginButton";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const nextParam = params.next;
  const next = (Array.isArray(nextParam) ? nextParam[0] : nextParam) ?? "/";

  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-20">
      <div className="w-full rounded-2xl border border-border bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-ink">Se connecter</h1>
        <p className="mt-2 text-sm text-muted">
          Connectez-vous à Dabber pour gérer vos annonces et vos demandes.
        </p>

        <FacebookLoginButton next={next} />
      </div>
    </div>
  );
}
