import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";

export const metadata: Metadata = {
  title: "Nouveau mot de passe",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-20">
      <div className="w-full rounded-2xl border border-border bg-white p-8">
        <h1 className="text-xl font-semibold text-ink">Nouveau mot de passe</h1>
        <p className="mt-2 text-sm text-muted">
          Choisissez un mot de passe d’au moins 8 caractères.
        </p>
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
