"use client";

import Image from "next/image";

import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme";

type Props = {
  size?: number;
  className?: string;
  tintColor?: string;
  /** Above-the-fold logos (LCP) — maps to Next.js Image `priority`. */
  priority?: boolean;
};

export function LoadingLogo({ size = 72, className = "", tintColor, priority = false }: Props) {
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const resolvedTint = tintColor ?? palette.logoTint;

  return (
    <Image
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      priority={priority}
      aria-hidden
      className={`motion-safe:animate-spin rounded-[20%] ${className}`}
      style={{
        width: size,
        height: size,
        ...(resolvedTint
          ? {
              filter:
                "brightness(0) saturate(100%) invert(92%) sepia(6%) saturate(474%) hue-rotate(201deg) brightness(103%) contrast(93%)",
            }
          : undefined),
      }}
    />
  );
}
