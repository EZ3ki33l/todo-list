import { Suspense } from "react";

import { DashboardSkeleton } from "@/components/dashboard-skeleton";

import { HomeGate } from "./home-gate";

export default function HomePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <HomeGate />
    </Suspense>
  );
}
