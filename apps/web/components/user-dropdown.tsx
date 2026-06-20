"use client";

import { useEffect, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";

import { useThemeMode } from "@/lib/theme-context";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeInitials(str: string): string {
  const parts = str.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? "?").toUpperCase();
  return (
    (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
  ).toUpperCase();
}

export function UserDropdown() {
  const { user, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { themeName, toggleTheme } = useThemeMode();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ferme le menu au clic en dehors
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Ferme au Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!isLoaded || !user) return null;

  const isDark = themeName === "mocha";
  const initials = computeInitials(
    user.fullName ?? user.primaryEmailAddress?.emailAddress ?? "?",
  );
  const imageUrl = user.imageUrl;
  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const name = user.fullName ?? null;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Menu utilisateur"
        className="group flex size-9 items-center justify-center overflow-hidden rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-primary"
      >
        <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-app-primary">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name ?? "Photo de profil"}
              className="size-full object-cover"
            />
          ) : (
            <span className="text-xs font-bold text-app-on-primary">{initials}</span>
          )}
        </span>
      </button>

      {/* Menu */}
      {open && (
        <div
          role="menu"
          className="absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 overflow-hidden rounded-2xl border border-app-border-soft bg-app-bg-elevated shadow-xl"
        >
          <div className="flex items-center gap-3 border-b border-app-border-soft px-4 py-4">
            <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-app-primary">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="size-full object-cover" aria-hidden />
              ) : (
                <span className="text-sm font-bold text-app-on-primary">{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              {name && (
                <p className="truncate text-sm font-semibold text-app-text">{name}</p>
              )}
              <p className="truncate text-xs text-app-text-muted">{email}</p>
            </div>
          </div>

          <div className="space-y-3 p-3">
            <div className="rounded-xl border border-app-border-soft bg-app-bg-elevated px-3 py-2.5">
              <div className="flex items-center gap-3">
                <span className="text-[17px]">🎨</span>
                <span className="flex-1 text-sm text-app-text">Thème</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isDark}
                  aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
                  onClick={toggleTheme}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-primary ${
                    isDark ? "bg-app-primary" : "bg-app-border-soft"
                  }`}
                >
                  <span
                    className={`inline-flex size-5 items-center justify-center rounded-full bg-white text-[10px] shadow-sm transition-transform ${
                      isDark ? "translate-x-6" : "translate-x-1"
                    }`}
                  >
                    {isDark ? "🌙" : "☀️"}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openUserProfile();
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-app-border-soft bg-app-bg-elevated px-3 py-2.5 text-left text-sm text-app-text hover:bg-app-bg-soft"
            >
              <span className="text-[17px]">👤</span>
              <span className="flex-1">Personnaliser le profil</span>
              <span className="text-app-text-subtle">›</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              className="w-full rounded-xl bg-app-danger px-3 py-2.5 text-sm font-semibold text-app-on-primary hover:opacity-90"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
