import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import type { ActionRow } from "../../lib/day-week-split";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@repo/theme", () => ({
  getPalette: vi.fn(() => ({
    bgElevated: "#ffffff",
    borderSoft: "#e0e0e0",
    border: "#cccccc",
    text: "#000000",
    textSubtle: "#666666",
    textMuted: "#999999",
    primary: "#007AFF",
    onPrimary: "#ffffff",
    success: "#34C759",
    recurrenceDailyText: "#007AFF",
    recurrenceDailyBg: "#E3F2FD",
    recurrenceWeeklyText: "#9C27B0",
    recurrenceWeeklyBg: "#F3E5F5",
  })),
}));

vi.mock("@/lib/theme-context", () => ({
  useThemeMode: vi.fn(() => ({ themeName: "latte" })),
}));

vi.mock("@/components/action-location-sheet", () => ({
  ActionLocationSheet: () => null,
}));

vi.mock("@/components/streak-badge", () => ({
  StreakBadge: () => null,
}));

vi.mock("@/components/fluent-emoji", () => ({
  FluentEmoji: ({ emoji }: { emoji: string }) => <span>{emoji}</span>,
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const baseAction: ActionRow = {
  id: "action-1",
  title: "Faire la vaisselle",
  done: false,
  recurrence: "NONE",
  recurrenceTime: null,
  recurrenceDow: null,
  dueAt: null,
  position: 0,
  streakCount: 0,
  bestStreak: 0,
  locationLabel: null,
  locationAddress: null,
  notes: null,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ActionItemRow", () => {
  let ActionItemRow: typeof import("../action-item-row").ActionItemRow;

  beforeEach(() => {
    vi.clearAllMocks();
    ActionItemRow = (vi.importActual("../action-item-row") as any).ActionItemRow;
  });

  it("affiche le titre de l'action", async () => {
    const { ActionItemRow } = await import("../action-item-row");
    render(<ActionItemRow action={baseAction} onToggle={vi.fn()} />);
    expect(screen.getByText("Faire la vaisselle")).toBeDefined();
  });

  it("affiche le badge quotidien pour DAILY", async () => {
    const { ActionItemRow } = await import("../action-item-row");
    render(<ActionItemRow action={{ ...baseAction, recurrence: "DAILY" }} onToggle={vi.fn()} />);
    expect(screen.getByText("quotidien")).toBeDefined();
  });

  it("affiche le badge hebdo avec le jour pour WEEKLY", async () => {
    const { ActionItemRow } = await import("../action-item-row");
    render(
      <ActionItemRow
        action={{ ...baseAction, recurrence: "WEEKLY", recurrenceDow: 2 }}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText("hebdo · Mar")).toBeDefined();
  });

  it("affiche juste hebdo quand hideDayTag=true", async () => {
    const { ActionItemRow } = await import("../action-item-row");
    render(
      <ActionItemRow
        action={{ ...baseAction, recurrence: "WEEKLY", recurrenceDow: 2 }}
        onToggle={vi.fn()}
        hideDayTag
      />,
    );
    expect(screen.getByText("hebdo")).toBeDefined();
    expect(screen.queryByText("hebdo · Mar")).toBeNull();
  });

  it("affiche les notes quand présentes", async () => {
    const { ActionItemRow } = await import("../action-item-row");
    render(
      <ActionItemRow
        action={{ ...baseAction, notes: "Avec de l'eau chaude" }}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText("Avec de l'eau chaude")).toBeDefined();
  });

  it("n'affiche pas les boutons Modifier/Supprimer sans canEdit", async () => {
    const { ActionItemRow } = await import("../action-item-row");
    render(<ActionItemRow action={baseAction} onToggle={vi.fn()} />);
    expect(screen.queryByLabelText("Modifier")).toBeNull();
    expect(screen.queryByLabelText("Supprimer")).toBeNull();
  });

  it("affiche les boutons Modifier et Supprimer quand canEdit=true", async () => {
    const { ActionItemRow } = await import("../action-item-row");
    render(<ActionItemRow action={baseAction} onToggle={vi.fn()} canEdit />);
    expect(screen.getByLabelText("Modifier")).toBeDefined();
    expect(screen.getByLabelText("Supprimer")).toBeDefined();
  });

  it("appelle onStartEdit au clic sur Modifier", async () => {
    const { ActionItemRow } = await import("../action-item-row");
    const onStartEdit = vi.fn();
    render(<ActionItemRow action={baseAction} onToggle={vi.fn()} canEdit onStartEdit={onStartEdit} />);
    fireEvent.click(screen.getByLabelText("Modifier"));
    expect(onStartEdit).toHaveBeenCalled();
  });

  it("appelle onDelete au clic sur Supprimer", async () => {
    const { ActionItemRow } = await import("../action-item-row");
    const onDelete = vi.fn();
    render(<ActionItemRow action={baseAction} onToggle={vi.fn()} canEdit onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText("Supprimer"));
    expect(onDelete).toHaveBeenCalled();
  });

  it("affiche le formulaire d'édition quand editing=true", async () => {
    const { ActionItemRow } = await import("../action-item-row");
    render(
      <ActionItemRow
        action={baseAction}
        onToggle={vi.fn()}
        editing
        editTitle="Faire la vaisselle"
        onEditTitleChange={vi.fn()}
        onSaveEdit={vi.fn()}
        onCancelEdit={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText("Titre de la tâche")).toBeDefined();
  });

  it("appelle onSaveEdit au clic sur Enregistrer", async () => {
    const { ActionItemRow } = await import("../action-item-row");
    const onSaveEdit = vi.fn();
    render(
      <ActionItemRow
        action={baseAction}
        onToggle={vi.fn()}
        editing
        editTitle="Faire la vaisselle"
        onEditTitleChange={vi.fn()}
        onSaveEdit={onSaveEdit}
        onCancelEdit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Enregistrer"));
    expect(onSaveEdit).toHaveBeenCalled();
  });

  it("appelle onCancelEdit au clic sur Annuler", async () => {
    const { ActionItemRow } = await import("../action-item-row");
    const onCancelEdit = vi.fn();
    render(
      <ActionItemRow
        action={baseAction}
        onToggle={vi.fn()}
        editing
        editTitle="Faire la vaisselle"
        onEditTitleChange={vi.fn()}
        onSaveEdit={vi.fn()}
        onCancelEdit={onCancelEdit}
      />,
    );
    fireEvent.click(screen.getByText("Annuler"));
    expect(onCancelEdit).toHaveBeenCalled();
  });

  it("appelle onToggle au clic sur le titre", async () => {
    const { ActionItemRow } = await import("../action-item-row");
    const onToggle = vi.fn();
    render(<ActionItemRow action={baseAction} onToggle={onToggle} />);
    fireEvent.click(screen.getByText("Faire la vaisselle"));
    expect(onToggle).toHaveBeenCalled();
  });
});
