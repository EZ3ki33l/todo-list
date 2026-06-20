import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ActionItem } from "../action-item";
import type { ActionItemData } from "../action-item";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("next/link", () => ({
  default: ({ href, children, className }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

const mockDeleteMutate = vi.fn();
const mockUpdateMutate = vi.fn();

vi.mock("@/lib/use-action-mutations", () => ({
  useDeleteAction: vi.fn(() => ({ mutate: mockDeleteMutate, isPending: false })),
  useUpdateAction: vi.fn(() => ({ mutate: mockUpdateMutate, isPending: false })),
}));

vi.mock("@/lib/confirm-delete", () => ({
  confirmPermanentDelete: vi.fn(() => true),
}));

vi.mock("@/lib/use-mounted", () => ({
  useMounted: vi.fn(() => true),
}));

vi.mock("@/components/action-toggle-button", () => ({
  ActionToggleButton: ({ done }: { done: boolean }) => (
    <button data-testid="toggle-btn">{done ? "done" : "not-done"}</button>
  ),
}));

vi.mock("@/components/action-location-dialog", () => ({
  ActionLocationDialog: () => null,
}));

vi.mock("@/components/hydratable-svg", () => ({
  HydratableSvg: ({ children }: { children?: React.ReactNode }) => <svg>{children}</svg>,
}));

vi.mock("@repo/api/lib/maps", () => ({
  formatActionLocation: vi.fn(() => null),
  resolveMapsQuery: vi.fn(() => null),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const baseAction: ActionItemData = {
  id: "action-1",
  title: "Acheter du lait",
  done: false,
  recurrence: "NONE",
  recurrenceTime: null,
  recurrenceDow: null,
  dueAt: null,
  locationLabel: null,
  locationAddress: null,
  notes: null,
  streakCount: 0,
  bestStreak: 0,
  list: { id: "list-1", title: "Ma liste" },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ActionItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche le titre de l'action", () => {
    render(<ActionItem action={baseAction} />);
    expect(screen.getByText("Acheter du lait")).toBeDefined();
  });

  it("affiche le lien vers la liste par défaut", () => {
    render(<ActionItem action={baseAction} />);
    expect(screen.getByText("Ma liste")).toBeDefined();
  });

  it("masque le lien liste quand showListLink=false", () => {
    render(<ActionItem action={baseAction} showListLink={false} />);
    expect(screen.queryByText("Ma liste")).toBeNull();
  });

  it("affiche les notes quand présentes", () => {
    render(<ActionItem action={{ ...baseAction, notes: "Lait entier" }} />);
    expect(screen.getByText("Lait entier")).toBeDefined();
  });

  it("affiche le badge quotidien pour DAILY", () => {
    render(<ActionItem action={{ ...baseAction, recurrence: "DAILY" }} />);
    expect(screen.getByText("quotidien")).toBeDefined();
  });

  it("affiche le badge hebdo avec le jour pour WEEKLY", () => {
    render(<ActionItem action={{ ...baseAction, recurrence: "WEEKLY", recurrenceDow: 1 }} />);
    expect(screen.getByText("hebdo · Lun")).toBeDefined();
  });

  it("affiche juste hebdo quand hideDayTag=true", () => {
    render(
      <ActionItem
        action={{ ...baseAction, recurrence: "WEEKLY", recurrenceDow: 1 }}
        hideDayTag
      />,
    );
    expect(screen.getByText("hebdo")).toBeDefined();
    expect(screen.queryByText(/hebdo · Lun/)).toBeNull();
  });

  it("affiche le badge streak quand streakCount > 0 et récurrence active", () => {
    render(
      <ActionItem
        action={{ ...baseAction, recurrence: "DAILY", streakCount: 5, bestStreak: 10 }}
      />,
    );
    expect(screen.getByText(/série 5/)).toBeDefined();
    expect(screen.getByText(/record 10/)).toBeDefined();
  });

  it("n'affiche pas le record quand bestStreak = streakCount", () => {
    render(
      <ActionItem
        action={{ ...baseAction, recurrence: "DAILY", streakCount: 5, bestStreak: 5 }}
      />,
    );
    expect(screen.queryByText(/record/)).toBeNull();
  });

  it("rend un <li> par défaut (embedded=false)", () => {
    const { container } = render(<ActionItem action={baseAction} />);
    expect(container.querySelector("li")).toBeTruthy();
    expect(container.querySelector("div.rounded-lg")).toBeNull();
  });

  it("rend un <div> quand embedded=true", () => {
    const { container } = render(<ActionItem action={baseAction} embedded />);
    expect(container.querySelector("li")).toBeNull();
    expect(container.querySelector("div.rounded-lg")).toBeTruthy();
  });

  it("n'affiche pas les boutons Modifier/Supprimer sans canEdit", () => {
    render(<ActionItem action={baseAction} />);
    expect(screen.queryByLabelText("Modifier")).toBeNull();
    expect(screen.queryByLabelText("Supprimer")).toBeNull();
  });

  it("affiche les boutons Modifier/Supprimer avec canEdit", () => {
    render(<ActionItem action={baseAction} canEdit />);
    expect(screen.getByLabelText("Modifier")).toBeDefined();
    expect(screen.getByLabelText("Supprimer")).toBeDefined();
  });

  it("ouvre le formulaire d'édition au clic sur Modifier", () => {
    render(<ActionItem action={baseAction} canEdit />);
    fireEvent.click(screen.getByLabelText("Modifier"));
    expect(screen.getByDisplayValue("Acheter du lait")).toBeDefined();
  });

  it("ferme le formulaire d'édition au clic sur Annuler", () => {
    render(<ActionItem action={baseAction} canEdit />);
    fireEvent.click(screen.getByLabelText("Modifier"));
    fireEvent.click(screen.getByText("Annuler"));
    expect(screen.queryByDisplayValue("Acheter du lait")).toBeNull();
    expect(screen.getByText("Acheter du lait")).toBeDefined();
  });

  it("soumet la mise à jour au clic sur Enregistrer", () => {
    render(<ActionItem action={baseAction} canEdit />);
    fireEvent.click(screen.getByLabelText("Modifier"));
    const input = screen.getByDisplayValue("Acheter du lait");
    fireEvent.change(input, { target: { value: "Acheter du pain" } });
    fireEvent.click(screen.getByText("Enregistrer"));
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ actionId: "action-1" }),
      expect.anything(),
    );
  });

  it("appelle confirmPermanentDelete et deleteAction.mutate au clic Supprimer", async () => {
    const { confirmPermanentDelete } = await import("@/lib/confirm-delete");
    render(<ActionItem action={baseAction} canEdit />);
    fireEvent.click(screen.getByLabelText("Supprimer"));
    expect(confirmPermanentDelete).toHaveBeenCalledWith("Acheter du lait");
    expect(mockDeleteMutate).toHaveBeenCalledWith(
      { actionId: "action-1" },
      expect.anything(),
    );
  });

  it("n'appelle pas mutate si confirmPermanentDelete retourne false", async () => {
    const { confirmPermanentDelete } = await import("@/lib/confirm-delete");
    vi.mocked(confirmPermanentDelete).mockReturnValue(false);
    render(<ActionItem action={baseAction} canEdit />);
    fireEvent.click(screen.getByLabelText("Supprimer"));
    expect(mockDeleteMutate).not.toHaveBeenCalled();
  });
});
