import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useThemeMode } from "@/lib/theme-context";

import { UserDropdown } from "../user-dropdown";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSignOut = vi.fn();
const mockOpenUserProfile = vi.fn();
const mockToggleTheme = vi.fn();

vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn(() => ({
    user: {
      fullName: "Jean Dupont",
      primaryEmailAddress: { emailAddress: "jean@example.com" },
      imageUrl: null,
    },
    isLoaded: true,
  })),
  useClerk: vi.fn(() => ({
    signOut: mockSignOut,
    openUserProfile: mockOpenUserProfile,
  })),
}));

vi.mock("@/lib/theme-context", () => ({
  useThemeMode: vi.fn(() => ({
    themeName: "latte",
    toggleTheme: mockToggleTheme,
  })),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("UserDropdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUser).mockReturnValue({
      user: {
        fullName: "Jean Dupont",
        primaryEmailAddress: { emailAddress: "jean@example.com" },
        imageUrl: null,
      },
      isLoaded: true,
    } as ReturnType<typeof useUser>);
    vi.mocked(useClerk).mockReturnValue({
      signOut: mockSignOut,
      openUserProfile: mockOpenUserProfile,
    } as unknown as ReturnType<typeof useClerk>);
    vi.mocked(useThemeMode).mockReturnValue({
      themeName: "latte",
      toggleTheme: mockToggleTheme,
    });
  });

  it("affiche le bouton avatar", () => {
    render(<UserDropdown />);
    expect(screen.getByLabelText("Menu utilisateur")).toBeDefined();
  });

  it("retourne null quand l'utilisateur n'est pas chargé", () => {
    vi.mocked(useUser).mockReturnValue({ user: null, isLoaded: false } as ReturnType<typeof useUser>);
    const { container } = render(<UserDropdown />);
    expect(container.firstChild).toBeNull();
  });

  it("retourne null quand user est null mais chargé", () => {
    vi.mocked(useUser).mockReturnValue({ user: null, isLoaded: true } as ReturnType<typeof useUser>);
    const { container } = render(<UserDropdown />);
    expect(container.firstChild).toBeNull();
  });

  it("affiche les initiales dans le bouton quand pas d'imageUrl", () => {
    render(<UserDropdown />);
    expect(screen.getByText("JD")).toBeDefined();
  });

  it("n'affiche pas le menu par défaut", () => {
    render(<UserDropdown />);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("ouvre le menu au clic sur le bouton avatar", () => {
    render(<UserDropdown />);
    fireEvent.click(screen.getByLabelText("Menu utilisateur"));
    expect(screen.getByRole("menu")).toBeDefined();
  });

  it("affiche le nom et l'email dans le menu ouvert", () => {
    render(<UserDropdown />);
    fireEvent.click(screen.getByLabelText("Menu utilisateur"));
    expect(screen.getByText("Jean Dupont")).toBeDefined();
    expect(screen.getByText("jean@example.com")).toBeDefined();
  });

  it("ferme le menu avec la touche Escape", () => {
    render(<UserDropdown />);
    fireEvent.click(screen.getByLabelText("Menu utilisateur"));
    expect(screen.getByRole("menu")).toBeDefined();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("appelle toggleTheme au clic sur le switch de thème", () => {
    render(<UserDropdown />);
    fireEvent.click(screen.getByLabelText("Menu utilisateur"));
    fireEvent.click(screen.getByRole("switch"));
    expect(mockToggleTheme).toHaveBeenCalled();
  });

  it("appelle openUserProfile au clic sur Personnaliser le profil", () => {
    render(<UserDropdown />);
    fireEvent.click(screen.getByLabelText("Menu utilisateur"));
    fireEvent.click(screen.getByText("Personnaliser le profil"));
    expect(mockOpenUserProfile).toHaveBeenCalled();
  });

  it("ferme le menu après avoir cliqué Personnaliser le profil", () => {
    render(<UserDropdown />);
    fireEvent.click(screen.getByLabelText("Menu utilisateur"));
    fireEvent.click(screen.getByText("Personnaliser le profil"));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("appelle signOut au clic sur Se déconnecter", () => {
    render(<UserDropdown />);
    fireEvent.click(screen.getByLabelText("Menu utilisateur"));
    fireEvent.click(screen.getByText("Se déconnecter"));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("affiche le label mode sombre quand themeName=mocha", () => {
    vi.mocked(useThemeMode).mockReturnValue({ themeName: "mocha", toggleTheme: mockToggleTheme });
    render(<UserDropdown />);
    fireEvent.click(screen.getByLabelText("Menu utilisateur"));
    expect(screen.getByLabelText("Passer en mode clair")).toBeDefined();
  });

  it("affiche le label mode clair quand themeName=latte", () => {
    render(<UserDropdown />);
    fireEvent.click(screen.getByLabelText("Menu utilisateur"));
    expect(screen.getByLabelText("Passer en mode sombre")).toBeDefined();
  });
});
