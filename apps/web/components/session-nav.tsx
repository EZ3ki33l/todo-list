"use client";

import Link from "next/link";
import { UserButton, useAuth } from "@clerk/nextjs";

export function SessionNav() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <>
        <Link
          href="/login"
          className="text-sm px-3 py-1.5 rounded-md bg-app-primary text-app-on-primary hover:opacity-90"
        >
          Se connecter
        </Link>
        <Link
          href="/sign-up"
          className="text-sm px-3 py-1.5 rounded-md border border-app-border bg-app-bg-elevated hover:bg-app-bg-soft"
        >
          Créer un compte
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href="/dashboard" className="text-sm text-app-text-muted hover:text-app-text">
        Tâches
      </Link>
      <Link href="/dashboard/shopping" className="text-sm text-app-text-muted hover:text-app-text">
        Courses
      </Link>
      <UserButton />
    </>
  );
}
