import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { AddActionForm } from "../add-action-form";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();
const mockCancel = vi.fn();
const mockGetData = vi.fn(() => []);
const mockSetData = vi.fn();
const mockInvalidate = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      actions: {
        getByList: {
          cancel: mockCancel,
          getData: mockGetData,
          setData: mockSetData,
          invalidate: mockInvalidate,
        },
      },
    }),
    actions: {
      create: {
        useMutation: (_opts: unknown) => ({
          mutate: mockMutate,
          isPending: false,
        }),
      },
    },
  },
}));

vi.mock("@/components/add-action-detail-modal", () => ({
  AddActionDetailModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="detail-modal">Modal détails</div> : null,
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AddActionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("désactive le bouton Ajouter quand le titre est vide", () => {
    render(<AddActionForm listId="list-1" />);
    expect((screen.getByLabelText("Ajouter") as HTMLButtonElement).disabled).toBe(true);
  });

  it("désactive le bouton ++ quand le titre est vide", () => {
    render(<AddActionForm listId="list-1" />);
    expect((screen.getByLabelText("Ajouter avec lieu") as HTMLButtonElement).disabled).toBe(true);
  });

  it("active les boutons après saisie d'un titre", () => {
    render(<AddActionForm listId="list-1" />);
    fireEvent.change(screen.getByPlaceholderText("Nouvelle action..."), {
      target: { value: "Acheter du pain" },
    });
    expect((screen.getByLabelText("Ajouter") as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByLabelText("Ajouter avec lieu") as HTMLButtonElement).disabled).toBe(false);
  });

  it("appelle createAction.mutate au clic sur Ajouter", () => {
    render(<AddActionForm listId="list-1" />);
    fireEvent.change(screen.getByPlaceholderText("Nouvelle action..."), {
      target: { value: "Acheter du pain" },
    });
    fireEvent.click(screen.getByLabelText("Ajouter"));
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ listId: "list-1", title: "Acheter du pain" }),
    );
  });

  it("soumet l'action avec la touche Entrée", () => {
    render(<AddActionForm listId="list-1" />);
    const input = screen.getByPlaceholderText("Nouvelle action...");
    fireEvent.change(input, { target: { value: "Acheter du pain" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockMutate).toHaveBeenCalled();
  });

  it("n'appelle pas mutate si le titre est vide (touche Entrée)", () => {
    render(<AddActionForm listId="list-1" />);
    fireEvent.keyDown(screen.getByPlaceholderText("Nouvelle action..."), { key: "Enter" });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("ouvre la modale de détail au clic sur ++", () => {
    render(<AddActionForm listId="list-1" />);
    fireEvent.change(screen.getByPlaceholderText("Nouvelle action..."), {
      target: { value: "Acheter du pain" },
    });
    fireEvent.click(screen.getByLabelText("Ajouter avec lieu"));
    expect(screen.getByTestId("detail-modal")).toBeDefined();
  });

  it("affiche les trois options de récurrence", () => {
    render(<AddActionForm listId="list-1" />);
    expect(screen.getByText("Ponctuelle")).toBeDefined();
    expect(screen.getByText("Chaque jour")).toBeDefined();
    expect(screen.getByText("Chaque semaine")).toBeDefined();
  });

  it("Ponctuelle est sélectionné par défaut", () => {
    render(<AddActionForm listId="list-1" />);
    const noneRadio = screen.getByRole("radio", { name: "Ponctuelle" });
    expect((noneRadio as HTMLInputElement).checked).toBe(true);
  });

  it("affiche le champ heure après sélection DAILY", () => {
    render(<AddActionForm listId="list-1" />);
    fireEvent.click(screen.getByRole("radio", { name: "Chaque jour" }));
    const timeInputs = document.querySelectorAll('input[type="time"]');
    expect(timeInputs.length).toBeGreaterThan(0);
  });

  it("affiche les boutons de jours après sélection WEEKLY", () => {
    render(<AddActionForm listId="list-1" />);
    fireEvent.click(screen.getByRole("radio", { name: "Chaque semaine" }));
    expect(screen.getByText("Lun")).toBeDefined();
    expect(screen.getByText("Sam")).toBeDefined();
  });

  it("inclut recurrence DAILY dans la mutation", () => {
    render(<AddActionForm listId="list-1" />);
    fireEvent.click(screen.getByRole("radio", { name: "Chaque jour" }));
    fireEvent.change(screen.getByPlaceholderText("Nouvelle action..."), {
      target: { value: "Exercice" },
    });
    fireEvent.click(screen.getByLabelText("Ajouter"));
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ recurrence: "DAILY" }),
    );
  });
});
