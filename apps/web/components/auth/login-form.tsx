"use client";

import { useSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { LoadingLogo } from "@/components/loading-logo";

const inputClass =
  "mb-3 w-full rounded-lg border border-app-border bg-app-bg-elevated px-3 py-3 text-base text-app-text placeholder:text-app-text-subtle focus:outline-none focus:ring-2 focus:ring-app-primary/30";

async function finalizeClerkSignIn(signIn: ReturnType<typeof useSignIn>["signIn"]) {
  if (signIn.status !== "complete") return;
  await signIn.finalize();
}

export function LoginForm() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const busy = fetchStatus === "fetching" || submitting;

  async function handleSubmit() {
    setFormError(null);
    setSubmitting(true);
    try {
      const { error } = await signIn.password({ emailAddress, password });
      if (error) {
        setFormError(error.message ?? "Connexion impossible");
        return;
      }

      if (signIn.status === "complete") {
        await finalizeClerkSignIn(signIn);
        router.replace("/dashboard");
        return;
      }

      if (signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor") {
        const emailCodeFactor = signIn.supportedSecondFactors?.find(
          (factor) => factor.strategy === "email_code",
        );
        if (emailCodeFactor) {
          await signIn.mfa.sendEmailCode();
          setAwaitingCode(true);
          return;
        }
      }

      setFormError("Étape de connexion supplémentaire requise.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode() {
    setFormError(null);
    setSubmitting(true);
    try {
      const { error } = await signIn.mfa.verifyEmailCode({ code });
      if (error) {
        setFormError(error.message ?? "Code invalide ou expiré.");
        return;
      }

      if (signIn.status === "complete") {
        await finalizeClerkSignIn(signIn);
        router.replace("/dashboard");
        return;
      }

      setFormError("Code invalide ou expiré.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  if (awaitingCode) {
    return (
      <AuthShell title="Vérification" subtitle="Entrez le code reçu par e-mail." showLogo={false}>
        <label className="mb-1.5 block text-sm font-semibold text-app-text-muted">Code</label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123456"
          className={inputClass}
        />
        {errors.fields.code ? (
          <p className="mb-2 text-sm text-app-danger">{errors.fields.code.message}</p>
        ) : null}
        {formError ? <p className="mb-2 text-sm text-app-danger">{formError}</p> : null}
        <button
          type="button"
          onClick={() => void handleVerifyCode()}
          disabled={!code || busy}
          className="mt-2 flex w-full items-center justify-center rounded-lg bg-app-primary px-4 py-3.5 text-base font-semibold text-app-on-primary disabled:opacity-50"
        >
          {busy ? <LoadingLogo size={22} /> : "Valider"}
        </button>
        <button
          type="button"
          onClick={() => void signIn.mfa.sendEmailCode()}
          disabled={busy}
          className="mt-3 w-full py-2 text-sm font-semibold text-app-primary disabled:opacity-50"
        >
          Renvoyer le code
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Todolist by EZ3"
      subtitle="Connectez-vous pour accéder à vos listes."
    >
      <GoogleSignInButton mode="sign-in" disabled={busy} />
      <AuthDivider />

      <label className="mb-1.5 block text-sm font-semibold text-app-text-muted">E-mail</label>
      <input
        type="email"
        autoComplete="email"
        value={emailAddress}
        onChange={(e) => setEmailAddress(e.target.value)}
        placeholder="vous@exemple.fr"
        className={inputClass}
      />
      {errors.fields.identifier ? (
        <p className="mb-2 text-sm text-app-danger">{errors.fields.identifier.message}</p>
      ) : null}

      <label className="mb-1.5 block text-sm font-semibold text-app-text-muted">Mot de passe</label>
      <input
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        className={inputClass}
      />
      {errors.fields.password ? (
        <p className="mb-2 text-sm text-app-danger">{errors.fields.password.message}</p>
      ) : null}

      {formError ? <p className="mb-2 text-sm text-app-danger">{formError}</p> : null}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!emailAddress || !password || busy}
        className="mt-2 flex w-full items-center justify-center rounded-lg bg-app-primary px-4 py-3.5 text-base font-semibold text-app-on-primary disabled:opacity-50"
      >
        {busy ? <LoadingLogo size={22} /> : "Se connecter"}
      </button>

      <p className="mt-5 text-center text-sm text-app-text-muted">
        Pas encore de compte ?{" "}
        <Link href="/sign-up" className="font-semibold text-app-primary hover:underline">
          Créer un compte
        </Link>
      </p>
    </AuthShell>
  );
}
