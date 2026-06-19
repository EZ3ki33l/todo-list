"use client";

import Image from "next/image";

import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme";

type Props = {
  size?: number;
  className?: string;
  tintColor?: string;
};

export function LoadingLogo({ size = 72, className = "", tintColor }: Props) {
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const resolvedTint = tintColor ?? palette.logoTint;

  return (
    <Image
      src="/logo.png"
      alt=""
      width={size}
      height={size}
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
