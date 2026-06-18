import "../styles/global.css";

import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ActivityBell } from "@/components/activity-bell";
import { ClientOnly } from "@/components/client-only";
import { SessionNav } from "@/components/session-nav";
import { SessionNavFallback } from "@/components/session-nav-fallback";
import { ThemeScript } from "@/components/theme-script";
import { ThemeToggle } from "@/components/theme-toggle";
import { TrpcProvider } from "@/components/trpc-provider";
import { ThemeModeProvider } from "@/lib/theme-context";
import { getCachedAuthSession } from "@/lib/cached-session";

export const metadata: Metadata = {
  title: {
    default: "Todolist by EZ3",
    template: "%s | Todo list",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, token: initialToken } = await getCachedAuthSession();

  const shell = (
    <>
      <header className="w-full border-b border-app-border-soft bg-app-bg-elevated px-4 py-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 flex-wrap">
          <Suspense fallback={<SessionNavFallback />}>
            <SessionNav />
          </Suspense>
          <ThemeToggle />
          {session?.user ? (
            <ClientOnly
              fallback={
                <span
                  className="inline-block size-8 shrink-0 rounded-md"
                  aria-hidden
                />
              }
            >
              <ActivityBell />
            </ClientOnly>
          ) : null}
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
      <footer className="w-full border-t border-app-border-soft bg-app-bg-elevated px-4 py-3 sm:px-6 lg:px-8 text-sm text-app-text-subtle">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span>Todo list © {new Date().getFullYear()}</span>
          <span aria-hidden className="text-app-border">
            ·
          </span>
          <Link
            href="/politique-de-confidentialite"
            className="hover:text-app-text underline-offset-2 hover:underline"
          >
            Politique de confidentialité
          </Link>
        </div>
      </footer>
    </>
  );

  return (
    <html lang="fr" suppressHydrationWarning data-theme="latte">
      <head>
        <ThemeScript />
      </head>
      <body suppressHydrationWarning className="min-h-screen flex flex-col font-sans bg-app-bg text-app-text">
        <ThemeModeProvider>
          <ClerkProvider>
            {session?.user ? (
              <TrpcProvider initialToken={initialToken}>{shell}</TrpcProvider>
            ) : (
              shell
            )}
          </ClerkProvider>
        </ThemeModeProvider>
      </body>
    </html>
  );
}
