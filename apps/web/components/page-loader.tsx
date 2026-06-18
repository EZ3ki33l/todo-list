export function PageLoader({ label = "Chargement…" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-app-border-soft border-t-app-primary" />
      <p className="text-sm text-app-text-subtle">{label}</p>
    </div>
  );
}
