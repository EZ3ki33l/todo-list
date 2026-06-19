"use client";

import { useSignUp } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { LoadingLogo } from "@/components/loading-logo";

const inputClass =
  "mb-3 w-full rounded-lg border border-app-border bg-app-bg-elevated px-3 py-3 text-base text-app-text placeholder:text-app-text-subtle focus:outline-none focus:ring-2 focus:ring-app-primary/30";

async function finalizeClerkSignUp(signUp: ReturnType<typeof useSignUp>["signUp"]) {
  if (signUp.status !== "complete") return;
  await signUp.finalize();
}

export function SignUpForm() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const busy = fetchStatus === "fetching";

  const needsEmailVerification =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  async function handleSubmit() {
    setFormError(null);
    const { error } = await signUp.password({ emailAddress, password });
    if (error) {
      setFormError(error.message ?? "Inscription impossible");
      return;
    }
    await signUp.verifications.sendEmailCode();
  }

  async function handleVerify() {
    setFormError(null);
    try {
      const { error } = await signUp.verifications.verifyEmailCode({ code });
      if (error) {
        setFormError(error.message ?? "Code invalide ou expiré.");
        return;
      }

      if (signUp.status === "complete") {
        await finalizeClerkSignUp(signUp);
        router.replace("/dashboard");
        return;
      }

      setFormError("Code invalide ou expiré.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Inscription impossible.");
    }
  }

  if (needsEmailVerification) {
    return (
      <AuthShell
        title="Vérifiez votre e-mail"
        subtitle={`Un code a été envoyé à ${emailAddress}.`}
        showLogo={false}
      >
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
          onClick={() => void handleVerify()}
          disabled={!code || busy}
          className="mt-2 flex w-full items-center justify-center rounded-lg bg-app-primary px-4 py-3.5 text-base font-semibold text-app-on-primary disabled:opacity-50"
        >
          {busy ? <LoadingLogo size={22} /> : "Valider"}
        </button>
        <button
          type="button"
          onClick={() => void signUp.verifications.sendEmailCode()}
          disabled={busy}
          className="mt-3 w-full py-2 text-sm font-semibold text-app-primary disabled:opacity-50"
        >
          Renvoyer le code
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Créer un compte" subtitle="Inscrivez-vous pour partager vos listes.">
      <GoogleSignInButton mode="sign-up" disabled={busy} label="S'inscrire avec Google" />
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
      {errors.fields.emailAddress ? (
        <p className="mb-2 text-sm text-app-danger">{errors.fields.emailAddress.message}</p>
      ) : null}

      <label className="mb-1.5 block text-sm font-semibold text-app-text-muted">Mot de passe</label>
      <input
        type="password"
        autoComplete="new-password"
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
        {busy ? <LoadingLogo size={22} /> : "S'inscrire"}
      </button>

      <div id="clerk-captcha" />

      <p className="mt-5 text-center text-sm text-app-text-muted">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-semibold text-app-primary hover:underline">
          Se connecter
        </Link>
      </p>
    </AuthShell>
  );
}
