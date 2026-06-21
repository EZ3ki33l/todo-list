"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

import { ActivityBell } from "@/components/activity-bell";
import { UserDropdown } from "@/components/user-dropdown";
import todoLogo from "@/public/ez3-todolist.png";
import shoppingLogo from "@/public/ez3-caddie.png";

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
    <div className="flex items-center justify-center gap-2">
      <Link
        href="/dashboard"
        className="flex h-14 w-14 flex-col items-center justify-center rounded-xl border border-app-border-soft bg-app-bg-elevated text-app-text-muted hover:bg-app-bg-soft hover:text-app-text"
        aria-label="Tâches"
      >
        <Image src={todoLogo} alt="" width={22} height={22} className="opacity-95" aria-hidden />
        <span className="mt-0.5 text-[10px] leading-none">Tâches</span>
      </Link>
      <Link
        href="/dashboard/shopping"
        className="flex h-14 w-14 flex-col items-center justify-center rounded-xl border border-app-border-soft bg-app-bg-elevated text-app-text-muted hover:bg-app-bg-soft hover:text-app-text"
        aria-label="Courses"
      >
        <Image src={shoppingLogo} alt="" width={22} height={22} className="opacity-95" aria-hidden />
        <span className="mt-0.5 text-[10px] leading-none">Courses</span>
      </Link>
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-app-border-soft bg-app-bg-elevated">
        <ActivityBell buttonClassName="hover:bg-transparent p-0.5 text-app-text-muted hover:text-app-text" />
      </div>
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-app-border-soft bg-app-bg-elevated">
        <UserDropdown />
      </div>
    </div>
  );
}
