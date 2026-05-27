import "../styles/global.css";

import { SessionNav } from "@/components/session-nav";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-screen flex flex-col font-sans">
        <header className="w-full border-b border-gray-200 px-4 py-3 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-4">
            <SessionNav />
          </div>
        </header>
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="w-full border-t border-gray-200 px-4 py-3 sm:px-6 lg:px-8 text-sm text-gray-500">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <span>Todo list © {new Date().getFullYear()}</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
