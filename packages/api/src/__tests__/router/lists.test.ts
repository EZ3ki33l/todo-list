import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockPrisma, resetMocks } from "../helpers/mock-prisma";

vi.mock("@repo/db", () => ({ prisma: mockPrisma }));
vi.mock("../../lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
  rateLimitResponse: vi.fn(),
}));
vi.mock("../../lib/default-lists", () => ({
  getOrCreatePersonalTodoList: vi.fn(),
  getSharedTodoLists: vi.fn(),
}));
vi.mock("../../lib/todo-list-access", () => ({
  findAccessibleTodoList: vi.fn(),
  findAccessibleAction: vi.fn(),
}));
vi.mock("../../lib/list-share-notify", () => ({
  notifyListShared: vi.fn(),
}));
vi.mock("../../lib/todo-list-share-notify", () => ({
  notifyTodoListShared: vi.fn(),
}));
vi.mock("../../lib/activity-events", () => ({
  recordListSharedActivity: vi.fn(),
}));

import { getOrCreatePersonalTodoList, getSharedTodoLists } from "../../lib/default-lists";
import { findAccessibleTodoList } from "../../lib/todo-list-access";
import { appRouter } from "../../router";

const USER_ID = "clq0000000000000000000000";

function caller(userId: string | null = USER_ID) {
  return appRouter.createCaller({ userId, ip: "127.0.0.1" });
}

function fakeList(overrides = {}) {
  return {
    id: "list1",
    title: "Ma liste",
    ownerId: USER_ID,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { actions: 0, members: 0 },
    ...overrides,
  };
}

describe("lists.getAll", () => {
  beforeEach(resetMocks);

  it("retourne les listes de l'utilisateur", async () => {
    const lists = [fakeList()];
    mockPrisma.todoList.findMany.mockResolvedValue(lists);

    const result = await caller().lists.getAll();
    expect(result).toEqual(lists);
    expect(mockPrisma.todoList.findMany).toHaveBeenCalledOnce();
  });

  it("lève UNAUTHORIZED si non authentifié", async () => {
    await expect(caller(null).lists.getAll()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("lists.getOrCreatePersonal", () => {
  beforeEach(resetMocks);

  it("délègue à getOrCreatePersonalTodoList", async () => {
    const list = fakeList({ title: "Mes tâches" });
    vi.mocked(getOrCreatePersonalTodoList).mockResolvedValue(list as any);

    const result = await caller().lists.getOrCreatePersonal();
    expect(result).toEqual(list);
    expect(getOrCreatePersonalTodoList).toHaveBeenCalledWith(USER_ID);
  });
});

describe("lists.create", () => {
  beforeEach(resetMocks);

  it("crée une nouvelle liste", async () => {
    const newList = fakeList({ title: "Nouvelle liste" });
    mockPrisma.todoList.create.mockResolvedValue(newList);

    const result = await caller().lists.create({ title: "Nouvelle liste" });
    expect(result.title).toBe("Nouvelle liste");
    expect(mockPrisma.todoList.create).toHaveBeenCalledWith({
      data: { title: "Nouvelle liste", ownerId: USER_ID },
    });
  });

  it("lève UNAUTHORIZED si non authentifié", async () => {
    await expect(
      caller(null).lists.create({ title: "Test" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("lists.getById", () => {
  const LIST_ID = "clq1111111111111111111111";

  beforeEach(resetMocks);

  it("retourne la liste si accessible", async () => {
    const list = fakeList({ id: LIST_ID, members: [], owner: { id: USER_ID, name: "Alice", email: "a@a.com", image: null } });
    vi.mocked(findAccessibleTodoList).mockResolvedValue(list as any);

    const result = await caller().lists.getById({ listId: LIST_ID });
    expect(result).toEqual(list);
  });

  it("propage FORBIDDEN si la liste n'est pas accessible", async () => {
    const { TRPCError } = await import("@trpc/server");
    vi.mocked(findAccessibleTodoList).mockRejectedValue(
      new TRPCError({ code: "FORBIDDEN", message: "Accès refusé" }),
    );

    await expect(
      caller().lists.getById({ listId: LIST_ID }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
