"use client";

import { SignUp } from "@clerk/nextjs";

import { getClerkAppearance } from "@/lib/clerk-appearance";
import { useThemeMode } from "@/lib/theme-context";

export default function SignUpPage() {
  const { themeName } = useThemeMode();

  return (
    <div className="flex flex-col items-center py-8">
      <h1 className="text-2xl font-bold mb-6 text-app-text">Créer un compte</h1>
      <SignUp
        routing="hash"
        signInUrl="/login"
        forceRedirectUrl="/dashboard"
        signInForceRedirectUrl="/dashboard"
        appearance={getClerkAppearance(themeName)}
      />
    </div>
  );
}
