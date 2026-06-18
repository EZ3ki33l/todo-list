"use client";

import { SHOPPING_UNITS } from "@/lib/grocery-ui";

export function UnitPicker({
  value,
  onChange,
  label = "Conditionnement (facultatif)",
}: {
  value: string | null;
  onChange: (unit: string | null) => void;
  label?: string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-app-text-subtle">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {SHOPPING_UNITS.map((u) => {
          const selected = (value ?? null) === u.value;
          return (
            <button
              key={u.value ?? "_none"}
              type="button"
              onClick={() => onChange(u.value)}
              className={`rounded-full border px-2.5 py-1 text-xs ${
                selected
                  ? "border-app-primary bg-app-primary text-app-on-primary"
                  : "border-app-border-soft bg-app-bg-elevated text-app-text hover:bg-app-bg-soft"
              }`}
            >
              {u.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
