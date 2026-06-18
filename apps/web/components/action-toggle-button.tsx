"use client";

import { HydratableSvg } from "@/components/hydratable-svg";
import { useToggleAction } from "@/lib/use-toggle-action";

interface Props {
  listId: string;
  actionId: string;
  done: boolean;
}

export function ActionToggleButton({ listId, actionId, done }: Props) {
  const toggle = useToggleAction(listId);

  return (
    <button
      type="button"
      aria-label={done ? "Marquer comme non fait" : "Marquer comme fait"}
      disabled={toggle.isPending && toggle.variables?.actionId === actionId}
      onClick={() => toggle.mutate({ actionId })}
      className={`mt-0.5 size-4 shrink-0 rounded border-2 transition-colors ${
        done ? "border-app-primary bg-app-primary" : "border-app-border hover:border-app-border"
      } ${toggle.isPending && toggle.variables?.actionId === actionId ? "opacity-60" : ""}`}
    >
      {done && (
        <HydratableSvg viewBox="0 0 12 12" className="size-full p-0.5">
          <path
            d="M2 6l3 3 5-5"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            suppressHydrationWarning
          />
        </HydratableSvg>
      )}
    </button>
  );
}
