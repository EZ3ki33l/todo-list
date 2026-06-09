import { Suspense } from "react";

import { DashboardSkeleton } from "@/components/dashboard-skeleton";

import { LoginGate } from "./login-gate";

export default function LoginPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <LoginGate />
    </Suspense>
  );
}
