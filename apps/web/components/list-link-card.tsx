import Link from "next/link";

export function ListLinkCard({
  href,
  title,
  subtitle,
  badge,
  shared,
}: {
  href: string;
  title: string;
  subtitle: string;
  badge?: string;
  shared?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-lg border px-4 py-3 shadow-sm transition-colors hover:bg-app-bg-soft ${
        shared
          ? "border-app-border-soft bg-app-badge-bg/40 hover:bg-app-badge-bg/70"
          : "border-app-border-soft bg-app-bg-elevated"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-app-text">{title}</span>
        {shared && (
          <span className="rounded-full bg-app-badge-bg px-2 py-0.5 text-xs font-medium text-app-badge-text">
            Partagée
          </span>
        )}
        {badge && (
          <span className="rounded-full bg-app-bg-soft px-2 py-0.5 text-xs text-app-text-muted">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-sm text-app-text-subtle">{subtitle}</p>
    </Link>
  );
}
