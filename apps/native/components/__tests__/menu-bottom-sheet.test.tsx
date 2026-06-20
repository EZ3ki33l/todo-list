import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useAuth } from "@/lib/auth-context";

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Simple mock sans React.forwardRef (hoisté avant imports)
vi.mock("@gorhom/bottom-sheet", () => ({
  default: ({ children }: { children?: unknown }) => (
    <div data-testid="bottom-sheet">{children as React.ReactNode}</div>
  ),
  BottomSheetBackdrop: () => null,
  BottomSheetView: ({ children }: { children?: unknown }) => (
    <div data-testid="bottom-sheet-view">{children as React.ReactNode}</div>
  ),
}));

vi.mock("tamagui", () => ({
  Avatar: Object.assign(
    ({ children }: { children?: unknown }) => (
      <div data-testid="avatar">{children as React.ReactNode}</div>
    ),
    {
      Image: () => null,
      Fallback: ({ children }: { children?: unknown }) => (
        <div>{children as React.ReactNode}</div>
      ),
    },
  ),
}));

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: vi.fn(() => ({ top: 0, right: 0, bottom: 34, left: 0 })),
}));

vi.mock("@repo/theme", () => ({
  getPalette: vi.fn(() => ({
    bgElevated: "#ffffff",
    borderSoft: "#e0e0e0",
    border: "#cccccc",
    bg: "#f5f5f5",
    bgSoft: "#eeeeee",
    text: "#000000",
    textSubtle: "#666666",
    textMuted: "#999999",
    primary: "#007AFF",
    onPrimary: "#ffffff",
    danger: "#FF3B30",
  })),
}));

const mockSignOut = vi.fn();

vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(() => ({
    user: { name: "Marie Curie", email: "marie@example.com", image: null },
    signOut: mockSignOut,
  })),
}));

vi.mock("@/lib/theme-context", () => ({
  useThemeMode: vi.fn(() => ({
    themeName: "latte",
    toggleTheme: vi.fn(),
  })),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("MenuBottomSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { name: "Marie Curie", email: "marie@example.com", image: null },
      signOut: mockSignOut,
    } as ReturnType<typeof useAuth>);
  });

  it("se monte sans erreur", async () => {
    const { MenuBottomSheet } = await import("../menu-bottom-sheet");
    render(<MenuBottomSheet openTick={0} onOpenProfile={vi.fn()} />);
    expect(screen.getByTestId("bottom-sheet")).toBeDefined();
  });

  it("affiche le nom de l'utilisateur", async () => {
    const { MenuBottomSheet } = await import("../menu-bottom-sheet");
    render(<MenuBottomSheet openTick={0} onOpenProfile={vi.fn()} />);
    expect(screen.getByText("Marie Curie")).toBeDefined();
  });

  it("affiche l'email de l'utilisateur", async () => {
    const { MenuBottomSheet } = await import("../menu-bottom-sheet");
    render(<MenuBottomSheet openTick={0} onOpenProfile={vi.fn()} />);
    expect(screen.getByText("marie@example.com")).toBeDefined();
  });

  it("affiche la section Thème", async () => {
    const { MenuBottomSheet } = await import("../menu-bottom-sheet");
    render(<MenuBottomSheet openTick={0} onOpenProfile={vi.fn()} />);
    expect(screen.getByText("Thème")).toBeDefined();
  });

  it("affiche le lien Personnaliser le profil", async () => {
    const { MenuBottomSheet } = await import("../menu-bottom-sheet");
    render(<MenuBottomSheet openTick={0} onOpenProfile={vi.fn()} />);
    expect(screen.getByText("Personnaliser le profil")).toBeDefined();
  });

  it("affiche le bouton Se déconnecter", async () => {
    const { MenuBottomSheet } = await import("../menu-bottom-sheet");
    render(<MenuBottomSheet openTick={0} onOpenProfile={vi.fn()} />);
    expect(screen.getByText("Se déconnecter")).toBeDefined();
  });

  it("appelle onOpenProfile au clic sur Personnaliser le profil", async () => {
    const { MenuBottomSheet } = await import("../menu-bottom-sheet");
    const onOpenProfile = vi.fn();
    render(<MenuBottomSheet openTick={0} onOpenProfile={onOpenProfile} />);
    fireEvent.click(screen.getByText("Personnaliser le profil"));
    expect(onOpenProfile).toHaveBeenCalled();
  });

  it("affiche Mon compte quand user.name est absent", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { name: null, email: "anon@example.com", image: null },
      signOut: mockSignOut,
    } as ReturnType<typeof useAuth>);
    const { MenuBottomSheet } = await import("../menu-bottom-sheet");
    render(<MenuBottomSheet openTick={0} onOpenProfile={vi.fn()} />);
    expect(screen.getByText("Mon compte")).toBeDefined();
  });
});
