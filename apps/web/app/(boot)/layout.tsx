import type { ReactNode } from "react";

export default function BootLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-app-bg">{children}</div>;
}
