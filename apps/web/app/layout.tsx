import "../styles/global.css";

import { ThemeScript } from "@/components/theme-script";
import { ThemeModeProvider } from "@/lib/theme-context";
import { DEFAULT_THEME_NAME } from "@/lib/theme";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "Todolist by EZ3",
    template: "%s | Todo list",
  },
};

const clerkPublishableKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? process.env.CLERK_PUBLISHABLE_KEY;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning data-theme={DEFAULT_THEME_NAME}>
      <head>
        <ThemeScript />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-app-bg font-sans text-app-text">
        <ThemeModeProvider>
          <ClerkProvider publishableKey={clerkPublishableKey}>{children}</ClerkProvider>
        </ThemeModeProvider>
      </body>
    </html>
  );
}
