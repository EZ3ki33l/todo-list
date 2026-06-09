"use client";

/** SVG avec suppressHydrationWarning (extensions type Dark Reader). */
export function HydratableSvg({
  children,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} suppressHydrationWarning>
      {children}
    </svg>
  );
}
