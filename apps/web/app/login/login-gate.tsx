"use client";

import { SignIn } from "@clerk/nextjs";

import { getClerkAppearance } from "@/lib/clerk-appearance";
import { useThemeMode } from "@/lib/theme-context";

export function LoginGate() {
  const { themeName } = useThemeMode();

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold text-app-text">Connexion</h1>
      <p className="mt-2 text-app-text-muted text-center">
        Connectez-vous pour accéder à vos listes partagées.
      </p>
      <div className="mt-6 flex justify-center">
        <SignIn
          routing="hash"
          signUpUrl="/sign-up"
          forceRedirectUrl="/dashboard"
          signUpForceRedirectUrl="/dashboard"
          appearance={getClerkAppearance(themeName)}
        />
      </div>
    </div>
  );
}
