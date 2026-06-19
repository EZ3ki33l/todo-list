"use client";

import Image from "next/image";
import type { ReactNode } from "react";

import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  showLogo?: boolean;
};

export function AuthShell({ title, subtitle, children, showLogo = true }: Props) {
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);

  return (
    <div className="mx-auto w-full max-w-md">
      {showLogo ? (
        <Image
          src="/logo.png"
          alt="Logo EZ3"
          width={96}
          height={96}
          className="mx-auto mb-4 rounded-[20px]"
          style={
            palette.logoTint
              ? {
                  filter:
                    "brightness(0) saturate(100%) invert(92%) sepia(6%) saturate(474%) hue-rotate(201deg) brightness(103%) contrast(93%)",
                }
              : undefined
          }
          priority
        />
      ) : null}
      <h1 className="text-center text-[28px] font-bold leading-tight text-app-text">{title}</h1>
      <p className="mt-2 mb-6 text-center text-[15px] text-app-text-muted">{subtitle}</p>
      {children}
    </div>
  );
}
