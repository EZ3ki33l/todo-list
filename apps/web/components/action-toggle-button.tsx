"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { toggleAction } from "@/app/actions/action";

interface Props {
  actionId: string;
  done: boolean;
}

export function ActionToggleButton({ actionId, done }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await toggleAction(actionId);
      router.refresh();
      if (result.listClosed) {
        window.alert("Liste terminée : toutes les tâches ponctuelles sont faites.");
      } else if (result.listDayComplete) {
        window.alert("Bravo ! Toutes les tâches du jour sont réalisées.");
      }
    });
  }

  return (
    <button
      type="button"
      aria-label={done ? "Marquer comme non fait" : "Marquer comme fait"}
      disabled={pending}
      onClick={handleClick}
      className={`mt-0.5 size-4 shrink-0 rounded border-2 transition-colors ${
        done ? "border-green-500 bg-green-500" : "border-gray-300 hover:border-gray-400"
      }`}
    >
      {done && (
        <svg viewBox="0 0 12 12" className="size-full p-0.5">
          <path
            d="M2 6l3 3 5-5"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      )}
    </button>
  );
}
