import { describe, expect, it } from "vitest";

import { listAccess } from "../list-access";

const OWNER = "user-owner";
const OTHER = "user-other";

describe("listAccess", () => {
  it("retourne un accès vide sans liste", () => {
    expect(listAccess(null, OWNER)).toEqual({
      isOwner: false,
      member: null,
      canWrite: false,
      isShared: false,
    });
    expect(listAccess(undefined, OWNER).canWrite).toBe(false);
  });

  it("reconnaît le propriétaire", () => {
    const access = listAccess({ ownerId: OWNER, members: [] }, OWNER);
    expect(access.isOwner).toBe(true);
    expect(access.canWrite).toBe(true);
    expect(access.member).toBeNull();
  });

  it("ne donne rien à un utilisateur anonyme", () => {
    const access = listAccess({ ownerId: OWNER, members: [] }, null);
    expect(access.isOwner).toBe(false);
    expect(access.canWrite).toBe(false);
  });

  it("donne l'écriture au rôle membre", () => {
    const access = listAccess(
      { ownerId: OWNER, members: [{ userId: OTHER, role: "membre" }] },
      OTHER,
    );
    expect(access.canWrite).toBe(true);
    expect(access.member).toEqual({ userId: OTHER, role: "membre" });
  });

  it("refuse l'écriture au rôle invité", () => {
    const access = listAccess(
      { ownerId: OWNER, members: [{ userId: OTHER, role: "invité" }] },
      OTHER,
    );
    expect(access.canWrite).toBe(false);
    expect(access.isShared).toBe(true);
  });

  it("marque une liste sans membre comme non partagée", () => {
    expect(listAccess({ ownerId: OWNER, members: [] }, OWNER).isShared).toBe(false);
  });

  it("marque partagée dès qu'un membre existe", () => {
    const access = listAccess(
      { ownerId: OWNER, members: [{ userId: OTHER, role: "membre" }] },
      OWNER,
    );
    expect(access.isShared).toBe(true);
  });

  it("utilise memberCount quand members est pré-filtré côté serveur", () => {
    // La page serveur ne remonte que l'adhésion de l'utilisateur courant.
    const access = listAccess(
      { ownerId: OWNER, members: [], memberCount: 3 },
      OWNER,
    );
    expect(access.isShared).toBe(true);
  });

  it("gère un ownerId absent", () => {
    const access = listAccess({ members: [{ userId: OTHER, role: "membre" }] }, OTHER);
    expect(access.isOwner).toBe(false);
    expect(access.canWrite).toBe(true);
    expect(access.isShared).toBe(true);
  });
});
