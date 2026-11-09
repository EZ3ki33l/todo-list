import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { prisma } from "@repo/db";
import { checkRateLimit } from "../lib/rate-limit";
import { findOwnedRecipe, recipeDetailInclude } from "../lib/recipe-access";
import {
  recipeChatWelcome,
  runRecipeChat,
  type RecipeChatMode,
} from "../lib/recipe-chat";
import { recipeDraftFromChatMessage } from "../lib/recipe-from-chat";
import { suggestRecipesFromIngredients } from "../lib/recipe-suggestions";
import { getShoppingListIngredientLines } from "../lib/shopping-list-ingredients";
import {
  browseMeals,
  listMealFilters,
  lookupMeal,
  mealDetailToDraft,
  randomMeal,
} from "../lib/themealdb";
import {
  catalogMealIdInput,
  catalogSearchInput,
  createRecipeInput,
  listIdInput,
  listRecipesInput,
  protectedProcedure,
  recipeIdInput,
  router,
  saveRecipeFromChatInput,
  updateRecipeInput,
} from "../trpc";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

type RecipeWrite = {
  title: string;
  timeLabel?: string | null;
  servings?: number | null;
  notes?: string | null;
  ingredients: { title: string; quantity?: number | null; unit?: string | null; category: string }[];
  steps: string[];
};

/** Les positions viennent de l'ordre du tableau reçu : le client n'a rien à calculer. */
function nestedChildren(input: RecipeWrite) {
  return {
    ingredients: {
      create: input.ingredients.map((ingredient, position) => ({
        title: ingredient.title,
        quantity: ingredient.quantity ?? null,
        unit: ingredient.unit ?? null,
        category: ingredient.category as "AUTRE",
        position,
      })),
    },
    steps: {
      create: input.steps.map((text, position) => ({ text, position })),
    },
  };
}

export const recipesRouter = router({
  /** Carnet de recettes de l'utilisateur, de la plus récente à la plus ancienne. */
  list: protectedProcedure.input(listRecipesInput).query(async ({ ctx, input }) => {
    const search = input.search?.trim();

    const recipes = await prisma.recipe.findMany({
      where: {
        ownerId: ctx.userId,
        ...(input.source ? { source: input.source } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { ingredients: { some: { title: { contains: search, mode: "insensitive" } } } },
              ],
            }
          : {}),
      },
      include: {
        _count: { select: { ingredients: true, steps: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      // Un élément de plus que demandé : sa présence indique qu'il reste une page.
      take: input.limit + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    });

    const hasMore = recipes.length > input.limit;
    const items = hasMore ? recipes.slice(0, input.limit) : recipes;

    return {
      items,
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    };
  }),

  getById: protectedProcedure.input(recipeIdInput).query(async ({ ctx, input }) => {
    return findOwnedRecipe(input.recipeId, ctx.userId, { include: recipeDetailInclude });
  }),

  create: protectedProcedure.input(createRecipeInput).mutation(async ({ ctx, input }) => {
    return prisma.recipe.create({
      data: {
        ownerId: ctx.userId,
        title: input.title,
        timeLabel: input.timeLabel ?? null,
        servings: input.servings ?? null,
        notes: input.notes ?? null,
        source: input.source,
        ...nestedChildren(input),
      },
      include: recipeDetailInclude,
    });
  }),

  /** Remplace intégralement ingrédients et étapes : le client envoie l'état complet. */
  update: protectedProcedure.input(updateRecipeInput).mutation(async ({ ctx, input }) => {
    await findOwnedRecipe(input.recipeId, ctx.userId, { select: { id: true } });

    return prisma.$transaction(async (tx) => {
      await tx.recipeIngredient.deleteMany({ where: { recipeId: input.recipeId } });
      await tx.recipeStep.deleteMany({ where: { recipeId: input.recipeId } });

      return tx.recipe.update({
        where: { id: input.recipeId },
        data: {
          title: input.title,
          timeLabel: input.timeLabel ?? null,
          servings: input.servings ?? null,
          notes: input.notes ?? null,
          ...nestedChildren(input),
        },
        include: recipeDetailInclude,
      });
    });
  }),

  delete: protectedProcedure.input(recipeIdInput).mutation(async ({ ctx, input }) => {
    await findOwnedRecipe(input.recipeId, ctx.userId, { select: { id: true } });
    await prisma.recipe.delete({ where: { id: input.recipeId } });
  }),

  /** Enregistre une recette proposée par le Chef IA, telle qu'affichée dans le chat. */
  saveFromChat: protectedProcedure
    .input(saveRecipeFromChatInput)
    .mutation(async ({ ctx, input }) => {
      const draft = recipeDraftFromChatMessage(input.messageText, input.recipeIndex);
      if (!draft) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Aucune recette trouvée dans ce message.",
        });
      }

      return prisma.recipe.create({
        data: {
          ownerId: ctx.userId,
          title: draft.title,
          timeLabel: draft.timeLabel,
          servings: draft.servings,
          notes: draft.notes,
          source: "CHEF_IA",
          ...nestedChildren(draft),
        },
        include: recipeDetailInclude,
      });
    }),

  /** Suggestions de plats à partir des articles non cochés d'une liste courses (Mistral). */
  suggestFromList: protectedProcedure
    .input(
      z.object({
        listId: listIdInput.shape.listId,
        limit: z.number().int().min(1).max(6).optional(),
        refresh: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!checkRateLimit(`recipes:user:${ctx.userId}`, 8, 60 * 60 * 1000)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Limite de suggestions atteinte. Réessayez plus tard.",
        });
      }

      const ingredients = await getShoppingListIngredientLines(input.listId, ctx.userId);

      try {
        return await suggestRecipesFromIngredients({
          listId: input.listId,
          ingredients,
          limit: input.limit,
          refresh: input.refresh,
        });
      } catch (err) {
        return mapRecipeError(err);
      }
    }),

  /** Chat cuisine : TheMealDB d'abord, Mistral si le catalogue est vide. */
  chat: protectedProcedure
    .input(
      z.object({
        listId: listIdInput.shape.listId,
        mode: z.enum(["from_list", "suggest_items", "seasonal_produce"]),
        messages: z.array(chatMessageSchema).min(1).max(24),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!checkRateLimit(`recipes:chat:${ctx.userId}`, 30, 60 * 60 * 1000)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Limite de messages atteinte. Réessayez plus tard.",
        });
      }

      const ingredients = await getShoppingListIngredientLines(input.listId, ctx.userId);

      try {
        return await runRecipeChat({
          mode: input.mode as RecipeChatMode,
          ingredients,
          messages: input.messages,
        });
      } catch (err) {
        return mapRecipeError(err);
      }
    }),

  /** Catalogue public TheMealDB : recherche, filtres, ou cuisine française par défaut. */
  catalogSearch: protectedProcedure.input(catalogSearchInput).query(async ({ ctx, input }) => {
    if (!checkRateLimit(`recipes:catalog:${ctx.userId}`, 60, 60 * 60 * 1000)) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Limite de consultation du catalogue atteinte. Réessayez plus tard.",
      });
    }

    try {
      return { items: await browseMeals(input) };
    } catch (err) {
      return mapRecipeError(err);
    }
  }),

  catalogFilters: protectedProcedure.query(async () => {
    try {
      return await listMealFilters();
    } catch (err) {
      return mapRecipeError(err);
    }
  }),

  catalogGet: protectedProcedure.input(catalogMealIdInput).query(async ({ ctx, input }) => {
    try {
      const meal = await lookupMeal(input.mealId);
      if (!meal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Recette introuvable dans le catalogue." });
      }

      const saved = await prisma.recipe.findFirst({
        where: { ownerId: ctx.userId, externalId: meal.id },
        select: { id: true },
      });

      return { meal, savedRecipeId: saved?.id ?? null };
    } catch (err) {
      return mapRecipeError(err);
    }
  }),

  catalogRandom: protectedProcedure.mutation(async () => {
    try {
      const meal = await randomMeal();
      if (!meal) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Impossible de tirer une recette au hasard.",
        });
      }
      return { meal };
    } catch (err) {
      return mapRecipeError(err);
    }
  }),

  /** Copie un plat TheMealDB dans le carnet personnel. */
  importFromCatalog: protectedProcedure
    .input(catalogMealIdInput)
    .mutation(async ({ ctx, input }) => {
      if (!checkRateLimit(`recipes:import:${ctx.userId}`, 40, 60 * 60 * 1000)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Limite d'imports atteinte. Réessayez plus tard.",
        });
      }

      try {
        const meal = await lookupMeal(input.mealId);
        if (!meal) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Recette introuvable dans le catalogue.",
          });
        }

        const existing = await prisma.recipe.findFirst({
          where: { ownerId: ctx.userId, externalId: meal.id },
          include: recipeDetailInclude,
        });
        if (existing) {
          return { recipe: existing, alreadyImported: true };
        }

        const draft = mealDetailToDraft(meal);
        const recipe = await prisma.recipe.create({
          data: {
            ownerId: ctx.userId,
            title: draft.title,
            timeLabel: draft.timeLabel,
            servings: draft.servings,
            notes: draft.notes,
            source: "MEALDB",
            imageUrl: meal.thumbUrl,
            externalId: meal.id,
            ...nestedChildren(draft),
          },
          include: recipeDetailInclude,
        });

        return { recipe, alreadyImported: false };
      } catch (err) {
        return mapRecipeError(err);
      }
    }),

  /** Message d'accueil du chat selon le mode choisi. */
  chatWelcome: protectedProcedure
    .input(
      z.object({
        listId: listIdInput.shape.listId,
        mode: z.enum(["from_list", "suggest_items", "seasonal_produce"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const ingredients = await getShoppingListIngredientLines(input.listId, ctx.userId);
      return {
        message: recipeChatWelcome(input.mode, ingredients.length),
        ingredientCount: ingredients.length,
      };
    }),
});

function mapRecipeError(err: unknown): never {
  if (err instanceof TRPCError) throw err;

  const message = err instanceof Error ? err.message : "Erreur inattendue";
  if (message.includes("au moins 2 articles")) {
    throw new TRPCError({ code: "BAD_REQUEST", message });
  }
  if (message.includes("MISTRAL_API_KEY")) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message });
  }
  if (message.includes("Limite Mistral") || message.includes("Réessayez")) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message });
  }
  if (message.includes("TheMealDB")) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
  }
  console.error("[recipes]", err);
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Impossible de générer des suggestions pour le moment.",
  });
}
