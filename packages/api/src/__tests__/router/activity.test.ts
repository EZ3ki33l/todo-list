import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockPrisma, resetMocks } from "../helpers/mock-prisma";

vi.mock("@repo/db", () => ({ prisma: mockPrisma }));
vi.mock("../../lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
  rateLimitResponse: vi.fn(),
}));
vi.mock("../../lib/activity-unread", () => ({
  getActivityUnreadSnapshot: vi.fn(),
}));

import { getActivityUnreadSnapshot } from "../../lib/activity-unread";
import { appRouter } from "../../router";

const USER_ID = "clq0000000000000000000000";

function caller(userId: string | null = USER_ID) {
  return appRouter.createCaller({ userId, ip: "127.0.0.1" });
}

function fakeEvent(overrides = {}) {
  return {
    id: "evt1",
    userId: USER_ID,
    type: "LIST_SHARED",
    read: false,
    createdAt: new Date(),
    listId: null,
    listKind: null,
    actorName: null,
    listTitle: null,
    ...overrides,
  };
}

describe("activity.unreadCount", () => {
  beforeEach(resetMocks);

  it("retourne le snapshot des non-lus", async () => {
    const snapshot = { count: 3, latest: null };
    vi.mocked(getActivityUnreadSnapshot).mockResolvedValue(snapshot);
    const result = await caller().activity.unreadCount();
    expect(result).toEqual(snapshot);
    expect(getActivityUnreadSnapshot).toHaveBeenCalledWith(USER_ID);
  });

  it("lève UNAUTHORIZED si non authentifié", async () => {
    await expect(caller(null).activity.unreadCount()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("activity.list", () => {
  beforeEach(resetMocks);

  it("retourne la liste paginée des événements", async () => {
    const events = [fakeEvent(), fakeEvent({ id: "evt2" })];
    mockPrisma.activityEvent.findMany.mockResolvedValue(events);

    const result = await caller().activity.list({ limit: 10, cursor: undefined });
    expect(result.items).toEqual(events);
    expect(result.nextCursor).toBeUndefined();
  });

  it("lève UNAUTHORIZED si non authentifié", async () => {
    await expect(
      caller(null).activity.list({ limit: 10, cursor: undefined }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("activity.markAllRead", () => {
  beforeEach(resetMocks);

  it("marque tous les événements comme lus (readAt)", async () => {
    mockPrisma.activityEvent.updateMany.mockResolvedValue({ count: 2 });
    await caller().activity.markAllRead();
    expect(mockPrisma.activityEvent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: USER_ID }),
      }),
    );
  });
});
