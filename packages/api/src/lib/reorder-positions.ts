import { TRPCError } from "@trpc/server";

/** Vérifie que orderedIds est une permutation exacte des ids de la liste. */
export function assertOrderedIdsMatch(
  existingIds: string[],
  orderedIds: string[],
): void {
  if (existingIds.length !== orderedIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "La liste des identifiants ne correspond pas aux éléments de la liste",
    });
  }
  const expected = new Set(existingIds);
  for (const id of orderedIds) {
    if (!expected.has(id)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Identifiant inconnu ou en double",
      });
    }
    expected.delete(id);
  }
  if (expected.size > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Tous les éléments de la liste doivent être inclus",
    });
  }
}
