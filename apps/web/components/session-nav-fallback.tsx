export function SessionNavFallback() {
  return (
    <div
      className="flex items-center justify-center gap-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Chargement de la session"
    >
      <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
      <div className="h-8 w-24 animate-pulse rounded-md bg-gray-200" />
    </div>
  );
}
