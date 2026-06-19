"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { DayWeekViewSkeleton } from "@/components/dashboard-skeleton";
import { LoadingLogo } from "@/components/loading-logo";

export function BootGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    router.replace(isSignedIn ? "/dashboard" : "/login");
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen flex-col px-4">
        <div className="mb-7 flex justify-center pt-12">
          <LoadingLogo size={64} />
        </div>
        <div className="flex-1 px-4 opacity-85">
          <DayWeekViewSkeleton />
        </div>
      </div>
    );
  }

  return null;
}
