import { TRPCError } from "@trpc/server";
import type { Prisma } from "@repo/db";
import { prisma } from "@repo/db";

/**
 * Une recette appartient à un seul utilisateur : pas de partage, donc pas de
 * distinction lecture / écriture comme pour les listes.
 */
export async function findOwnedRecipe<A extends Omit<Prisma.RecipeFindFirstArgs, "where">>(
  recipeId: string,
  userId: string,
  args?: A,
): Promise<NonNullable<Prisma.RecipeGetPayload<A>>> {
  const recipe = await prisma.recipe.findFirst({
    ...args,
    where: { id: recipeId, ownerId: userId },
  } as Prisma.RecipeFindFirstArgs);

  if (!recipe) {
    const exists = await prisma.recipe.count({ where: { id: recipeId } });
    throw new TRPCError({
      code: exists ? "FORBIDDEN" : "NOT_FOUND",
      message: exists ? "Accès refusé" : "Recette introuvable",
    });
  }

  return recipe as unknown as NonNullable<Prisma.RecipeGetPayload<A>>;
}

/** Ingrédients et étapes toujours rendus dans l'ordre saisi. */
export const recipeDetailInclude = {
  ingredients: { orderBy: { position: "asc" } },
  steps: { orderBy: { position: "asc" } },
} satisfies Prisma.RecipeInclude;
