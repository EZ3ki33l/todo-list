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
          className="text-sm px-3 py-1.5 rounded-md bg-gray-900 text-white hover:bg-gray-700"
        >
          Se connecter
        </Link>
        <Link
          href="/sign-up"
          className="text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-100"
        >
          Créer un compte
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
        Tâches
      </Link>
      <Link href="/dashboard/shopping" className="text-sm text-gray-600 hover:text-gray-900">
        Courses
      </Link>
      <UserButton />
    </>
  );
}
