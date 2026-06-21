import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockPrisma, resetMocks } from "../helpers/mock-prisma";

vi.mock("@repo/db", () => ({ prisma: mockPrisma }));
vi.mock("../../lib/clerk-user", () => ({
  ensureUserFromClerk: vi.fn(),
  userHasGoogleAccount: vi.fn().mockResolvedValue(false),
}));
vi.mock("../../lib/verify-clerk-session", () => ({
  verifyClerkSessionToken: vi.fn(),
}));
vi.mock("../../lib/google-calendar", () => ({
  checkGoogleCalendarAccess: vi.fn(),
}));
vi.mock("../../lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
  rateLimitResponse: vi.fn(),
}));
vi.mock("../../jwt", () => ({
  issueJwt: vi.fn().mockResolvedValue("test-jwt-token"),
  verifyJwtSub: vi.fn(),
  getJwtSecret: vi.fn(),
}));

import { appRouter } from "../../router";

const USER_ID = "clq0000000000000000000000";

function callerAuth(userId: string | null = USER_ID) {
  return appRouter.createCaller({ userId, ip: "127.0.0.1" });
}

describe("auth.me", () => {
  beforeEach(resetMocks);

  it("retourne les informations de l'utilisateur", async () => {
    const user = { id: USER_ID, name: "Alice", email: "alice@example.com", image: null };
    mockPrisma.user.findUnique.mockResolvedValue(user);

    const caller = callerAuth();
    const result = await caller.auth.me();

    expect(result).toEqual(user);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: USER_ID },
      select: { id: true, name: true, email: true, image: true },
    });
  });

  it("lève NOT_FOUND si l'utilisateur n'existe pas", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const caller = callerAuth();
    await expect(caller.auth.me()).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("lève UNAUTHORIZED si non authentifié", async () => {
    const caller = callerAuth(null);
    await expect(caller.auth.me()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("auth.linkedProviders", () => {
  beforeEach(resetMocks);

  it("retourne hasGoogle=false si l'utilisateur n'a pas de clerkId", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ clerkId: null });
    const caller = callerAuth();
    const result = await caller.auth.linkedProviders();
    expect(result.hasGoogle).toBe(false);
  });

  it("lève UNAUTHORIZED si non authentifié", async () => {
    const caller = callerAuth(null);
    await expect(caller.auth.linkedProviders()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
