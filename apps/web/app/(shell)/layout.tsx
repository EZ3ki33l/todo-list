import Link from "next/link";
import { Suspense } from "react";

import { SessionNav } from "@/components/session-nav";
import { SessionNavFallback } from "@/components/session-nav-fallback";
import { TrpcProvider } from "@/components/trpc-provider";
import { getCachedAuthSession } from "@/lib/cached-session";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const { session, token: initialToken } = await getCachedAuthSession();

  const shell = (
    <div className="flex min-h-screen flex-col">
      <header className="w-full border-b border-app-border-soft bg-app-bg-elevated px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-4">
          <Suspense fallback={<SessionNavFallback />}>
            <SessionNav />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      <footer className="w-full border-t border-app-border-soft bg-app-bg-elevated px-4 py-3 sm:px-6 lg:px-8 text-sm text-app-text-subtle">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1">
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
    </div>
  );

  if (session?.user) {
    return <TrpcProvider initialToken={initialToken}>{shell}</TrpcProvider>;
  }

  return shell;
}
