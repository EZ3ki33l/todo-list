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
      className={`block rounded-lg border px-4 py-3 shadow-sm transition-colors hover:bg-gray-50 ${
        shared
          ? "border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-gray-900">{title}</span>
        {shared && (
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
            Partagée
          </span>
        )}
        {badge && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
    </Link>
  );
}
