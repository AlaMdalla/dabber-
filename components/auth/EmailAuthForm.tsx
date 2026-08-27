"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errorMessage";

interface EmailAuthFormProps {
  next: string;
}

type Mode = "sign-in" | "sign-up";

export default function EmailAuthForm({ next }: EmailAuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    if (mode === "sign-in") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      setIsSubmitting(false);
      if (signInError) {
        setError(describeError(signInError));
        return;
      }

      router.push(next);
      router.refresh();
      return;
    }

    if (!fullName.trim()) {
      setIsSubmitting(false);
      setError("Veuillez saisir votre nom.");
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    setIsSubmitting(false);
    if (signUpError) {
      setError(describeError(signUpError));
      return;
    }

    if (data.session) {
      router.push(next);
      router.refresh();
    } else {
      setMessage(
        "Compte créé. Consultez votre e-mail pour confirmer votre adresse, puis connectez-vous.",
      );
    }
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
    setMessage(null);
  }

  async function handlePasswordReset() {
    setError(null);
    setMessage(null);
    if (!email.trim()) {
      setError("Saisissez d’abord votre adresse e-mail.");
      return;
    }

    setIsResetting(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      },
    );
    setIsResetting(false);

    if (resetError) {
      setError(describeError(resetError));
    } else {
      setMessage("Consultez votre e-mail pour choisir un nouveau mot de passe.");
    }
  }

  async function handleGoogleAuth() {
    setError(null);
    setMessage(null);
    setIsGoogleSubmitting(true);

    const supabase = createClient();
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (googleError) {
      setIsGoogleSubmitting(false);
      setError(describeError(googleError));
    }
  }

  return (
    <div className="mt-6">
      <div className="grid grid-cols-2 rounded-xl bg-subtle p-1" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "sign-in"}
          onClick={() => changeMode("sign-in")}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            mode === "sign-in" ? "bg-white text-ink shadow-sm" : "text-muted"
          }`}
        >
          Connexion
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "sign-up"}
          onClick={() => changeMode("sign-up")}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            mode === "sign-up" ? "bg-white text-ink shadow-sm" : "text-muted"
          }`}
        >
          Créer un compte
        </button>
      </div>

      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={isGoogleSubmitting || isSubmitting}
        className="mt-5 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-60"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
        >
          <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.32 2.98-7.4Z" />
          <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
          <path fill="#FBBC05" d="M6.39 13.86A6.01 6.01 0 0 1 6.08 12c0-.65.11-1.28.31-1.86V7.52H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.48l3.35-2.62Z" />
          <path fill="#EA4335" d="M12 6.01c1.47 0 2.79.5 3.82 1.5l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.77 9.39 6.01 12 6.01Z" />
        </svg>
        {isGoogleSubmitting
          ? "Redirection vers Google…"
          : mode === "sign-in"
            ? "Continuer avec Google"
            : "S’inscrire avec Google"}
      </button>

      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted">ou par e-mail</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
        {mode === "sign-up" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="full-name" className="text-xs font-semibold text-ink">
              Nom affiché
            </label>
            <input
              id="full-name"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="h-12 rounded-xl border border-border px-3.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-semibold text-ink">
            Adresse e-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-12 rounded-xl border border-border px-3.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className="text-xs font-semibold text-ink">
              Mot de passe
            </label>
            {mode === "sign-in" && (
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={isResetting}
                className="text-xs font-medium text-muted underline underline-offset-2 hover:text-ink disabled:opacity-60"
              >
                {isResetting ? "Envoi…" : "Mot de passe oublié ?"}
              </button>
            )}
          </div>
          <input
            id="password"
            type="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-12 rounded-xl border border-border px-3.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>

        {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
        {message && <p role="status" className="text-sm font-medium text-green-700">{message}</p>}

        <button
          type="submit"
          disabled={isSubmitting || isGoogleSubmitting}
          className="h-12 rounded-xl bg-accent px-5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {isSubmitting
            ? "Veuillez patienter…"
            : mode === "sign-in"
              ? "Se connecter"
              : "Créer mon compte"}
        </button>
      </form>
    </div>
  );
}
