import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkRateLimit } from "../lib/rate-limit";
import {
  recipeChatWelcome,
  runRecipeChat,
  type RecipeChatMode,
} from "../lib/recipe-chat";
import { suggestRecipesFromIngredients } from "../lib/recipe-suggestions";
import { getShoppingListIngredientLines } from "../lib/shopping-list-ingredients";
import { listIdInput, protectedProcedure, router } from "../trpc";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

export const recipesRouter = router({
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

  /** Chat cuisine avec Chef IA (Mistral). */
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
  console.error("[recipes]", err);
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Impossible de générer des suggestions pour le moment.",
  });
}
