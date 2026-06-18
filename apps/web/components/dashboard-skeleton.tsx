import { DAY_WEEK_GRID_CLASS, DAY_WEEK_SECTION_CLASS } from "@/lib/day-week-layout";

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-app-skeleton ${className}`} />;
}

function TaskRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <SkeletonLine className="h-5 w-5 shrink-0 rounded-full" />
      <SkeletonLine className="h-4 flex-1 max-w-[85%]" />
    </div>
  );
}

export function TaskColumnSkeleton() {
  return (
    <div className="flex h-full min-h-[8rem] flex-col overflow-hidden rounded-xl border border-app-border-soft bg-app-bg-elevated shadow-sm motion-safe:animate-pulse">
      <div className="shrink-0 border-b border-app-border-soft px-4 py-3">
        <SkeletonLine className="h-5 w-36" />
        <SkeletonLine className="mt-2 h-3 w-24" />
      </div>
      <div className="min-h-0 flex-1 space-y-1 px-4 py-3">
        <TaskRowSkeleton />
        <TaskRowSkeleton />
        <TaskRowSkeleton />
        <TaskRowSkeleton />
      </div>
    </div>
  );
}

/** Skeleton des colonnes Aujourd'hui / Semaine (même emprise que DayWeekViewClient). */
export function DayWeekViewSkeleton() {
  return (
    <section className={DAY_WEEK_SECTION_CLASS} aria-hidden>
      <div className={DAY_WEEK_GRID_CLASS}>
        <TaskColumnSkeleton />
        <TaskColumnSkeleton />
      </div>
    </section>
  );
}

/** Skeleton du dashboard tâches — affiché pendant auth / chargement initial. */
export function DashboardSkeleton() {
  return (
    <div
      className="space-y-10 motion-safe:animate-pulse"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Chargement du tableau de bord"
    >
      <SkeletonLine className="h-8 w-28" />

      <DayWeekViewSkeleton />

      <div className="space-y-3">
        <div className="flex gap-2">
          <SkeletonLine className="h-10 flex-1 rounded-md" />
          <SkeletonLine className="h-10 w-24 rounded-md" />
        </div>
      </div>

      <div className="space-y-3">
        <SkeletonLine className="h-4 w-32" />
        <SkeletonLine className="h-14 w-full rounded-lg" />
      </div>
    </div>
  );
}
