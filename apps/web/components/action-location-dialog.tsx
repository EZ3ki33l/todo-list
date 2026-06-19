"use client";

import { buildMapsSearchUrl, formatActionLocation, resolveMapsQuery } from "@repo/api/lib/maps";

type Props = {
  open: boolean;
  locationLabel: string | null;
  locationAddress: string | null;
  onClose: () => void;
};

export function ActionLocationDialog({
  open,
  locationLabel,
  locationAddress,
  onClose,
}: Props) {
  if (!open) return null;

  const display = formatActionLocation(locationLabel, locationAddress);
  const mapsQuery = resolveMapsQuery(locationLabel, locationAddress);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-location-title"
        className="w-full max-w-md rounded-xl border border-app-border-soft bg-app-bg-elevated p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="action-location-title" className="text-lg font-semibold text-app-text">
          Lieu
        </h2>
        {display ? (
          <p className="mt-2 text-sm text-app-text-muted">{display}</p>
        ) : (
          <p className="mt-2 text-sm text-app-text-subtle">Aucune adresse renseignée.</p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {mapsQuery ? (
            <a
              href={buildMapsSearchUrl(mapsQuery)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-app-primary px-4 py-2.5 text-sm font-semibold text-app-on-primary hover:opacity-90"
            >
              S&apos;y rendre
            </a>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-app-border px-4 py-2.5 text-sm font-semibold text-app-text-muted hover:bg-app-bg-soft"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
