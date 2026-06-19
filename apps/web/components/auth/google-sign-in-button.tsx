"use client";

import { useSignIn, useSignUp } from "@clerk/nextjs";
import { useState } from "react";

import { LoadingLogo } from "@/components/loading-logo";

type Props = {
  mode: "sign-in" | "sign-up";
  disabled?: boolean;
  label?: string;
};

export function GoogleSignInButton({
  mode,
  disabled = false,
  label = "Continuer avec Google",
}: Props) {
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn();
  const { signUp, fetchStatus: signUpFetchStatus } = useSignUp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = mode === "sign-in" ? signInFetchStatus : signUpFetchStatus;
  const isDisabled = disabled || busy || fetchStatus === "fetching";

  async function handlePress() {
    setError(null);
    setBusy(true);
    try {
      const callback = mode === "sign-in" ? "/login/sso-callback" : "/sign-up/sso-callback";
      if (mode === "sign-in") {
        const { error: ssoError } = await signIn.sso({
          strategy: "oauth_google",
          redirectUrl: "/dashboard",
          redirectCallbackUrl: callback,
        });
        if (ssoError) throw ssoError;
        return;
      }

      const { error: ssoError } = await signUp.sso({
        strategy: "oauth_google",
        redirectUrl: "/dashboard",
        redirectCallbackUrl: callback,
      });
      if (ssoError) throw ssoError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion Google impossible.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void handlePress()}
        disabled={isDisabled}
        className="flex w-full items-center justify-center rounded-lg border border-app-border bg-app-bg-elevated px-4 py-3.5 text-base font-semibold text-app-text transition hover:bg-app-bg-soft disabled:opacity-50"
      >
        {busy ? <LoadingLogo size={22} /> : label}
      </button>
      {error ? <p className="mt-2 text-sm text-app-danger">{error}</p> : null}
    </div>
  );
}
