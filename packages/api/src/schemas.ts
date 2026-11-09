import { z } from "zod";

import { toLocalDateInput } from "./lib/action-form";

export const recurrenceEnum = z.enum(["NONE", "DAILY", "WEEKLY"]);
export const listStatusEnum = z.enum(["ACTIVE", "ARCHIVED", "DONE"]);
export const memberRoleEnum = z.enum(["membre", "invité"]);
export const pushPlatformEnum = z.enum(["android", "ios", "web"]);

export const cuidSchema = z.string().cuid();
export const titleSchema = z.string().trim().min(1).max(200);
export const idTokenSchema = z.string().min(20).max(8192);
export const pushTokenSchema = z.string().min(1).max(512);
export const unitSchema = z.string().trim().max(20).nullable().optional();
export const iconSchema = z.string().max(64).nullable().optional();
export const quantitySchema = z.number().positive().max(99_999).nullable().optional();

export const recurrenceTimeSchema = z
  .union([
    z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

export const dueAtSchema = z.string().datetime().nullable().optional();

export const locationLabelSchema = z
  .string()
  .trim()
  .max(120)
  .nullable()
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

export const locationAddressSchema = z
  .string()
  .trim()
  .max(500)
  .nullable()
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

export const notesSchema = z
  .string()
  .trim()
  .max(5000)
  .nullable()
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

export const remindBeforeMinutesSchema = z
  .number()
  .int()
  .min(1)
  .max(60 * 24 * 30)
  .nullable()
  .optional();

export const emailOrIdSchema = z.union([
  z.string().email().max(254),
  cuidSchema,
]);

export const orderedIdsSchema = z.array(cuidSchema).min(1).max(500);

export const groceryCategoryEnum = z.enum([
  "LEGUME",
  "FRUIT",
  "VIANDE",
  "POISSON",
  "BOULANGERIE",
  "EPICERIE",
  "LAITIER",
  "BOISSON",
  "HYGIENE",
  "AUTRE",
]);

export const actionFieldsSchema = z.object({
  title: titleSchema,
  recurrence: recurrenceEnum.default("NONE"),
  recurrenceTime: recurrenceTimeSchema,
  recurrenceDow: z.number().int().min(0).max(6).nullable().optional(),
  dueAt: dueAtSchema,
  locationLabel: locationLabelSchema,
  locationAddress: locationAddressSchema,
  notes: notesSchema,
  remindBeforeMinutes: remindBeforeMinutesSchema,
});

function refineActionFields<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data, ctx) => {
    const row = data as z.infer<typeof actionFieldsSchema>;
    if (row.recurrence === "WEEKLY" && row.recurrenceDow == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "recurrenceDow requis pour une tâche hebdomadaire",
        path: ["recurrenceDow"],
      });
    }
    if (row.recurrence === "NONE") {
      if (!row.dueAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La date est obligatoire pour une tâche ponctuelle",
          path: ["dueAt"],
        });
        return;
      }
      const dueDay = toLocalDateInput(new Date(row.dueAt));
      const today = toLocalDateInput(new Date());
      if (dueDay < today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La date ne peut pas être antérieure à aujourd'hui",
          path: ["dueAt"],
        });
      }
    }
  });
}

export const actionInputSchema = refineActionFields(actionFieldsSchema);
export const createActionInput = refineActionFields(
  actionFieldsSchema.extend({
    listId: cuidSchema,
    addToGoogleCalendar: z.boolean().optional(),
  }),
);
export const updateActionInput = refineActionFields(
  actionFieldsSchema.extend({ actionId: cuidSchema }),
);

export const shoppingItemInputSchema = z.object({
  title: titleSchema,
  quantity: quantitySchema,
  unit: unitSchema,
  category: groceryCategoryEnum.default("AUTRE"),
  icon: iconSchema,
});

export const recipeSourceEnum = z.enum(["MANUAL", "CHEF_IA", "MEALDB"]);

export const mealDbIdSchema = z.string().regex(/^\d{1,10}$/);

export const catalogSearchInput = z.object({
  query: z.string().trim().max(80).optional(),
  category: z.string().trim().max(40).optional(),
  area: z.string().trim().max(40).optional(),
  ingredient: z.string().trim().max(80).optional(),
});

export const catalogMealIdInput = z.object({
  mealId: mealDbIdSchema,
});

export const recipeIngredientSchema = z.object({
  title: titleSchema,
  quantity: quantitySchema,
  unit: unitSchema,
  category: groceryCategoryEnum.default("AUTRE"),
});

export const recipeStepSchema = z.string().trim().min(1).max(2000);

export const recipeFieldsSchema = z.object({
  title: titleSchema,
  timeLabel: z.string().trim().max(60).nullable().optional().transform((v) => v || null),
  servings: z.number().int().min(1).max(100).nullable().optional(),
  notes: notesSchema,
  ingredients: z.array(recipeIngredientSchema).max(60).default([]),
  steps: z.array(recipeStepSchema).max(60).default([]),
});

export const recipeIdInput = z.object({ recipeId: cuidSchema });

export const createRecipeInput = recipeFieldsSchema.extend({
  source: recipeSourceEnum.default("MANUAL"),
});

export const updateRecipeInput = recipeFieldsSchema.extend({ recipeId: cuidSchema });

export const listRecipesInput = z.object({
  /** Recherche plein texte simple sur le titre et les ingrédients. */
  search: z.string().trim().max(200).optional(),
  source: recipeSourceEnum.optional(),
  limit: z.number().int().min(1).max(100).default(20),
  /** Id de la dernière recette reçue, pour la page suivante. */
  cursor: cuidSchema.optional(),
});

export const saveRecipeFromChatInput = z.object({
  /** Réponse brute du Chef IA, analysée par @repo/domain/chef-message. */
  messageText: z.string().trim().min(1).max(20_000),
  /** Index de la recette à retenir quand le message en contient plusieurs. */
  recipeIndex: z.number().int().min(0).max(20).default(0),
});

export const listIdInput = z.object({ listId: cuidSchema });
export const actionIdInput = z.object({ actionId: cuidSchema });
export const itemIdInput = z.object({ itemId: cuidSchema });

export const createListInput = z.object({ title: titleSchema });
export const renameListInput = z.object({ listId: cuidSchema, title: titleSchema });
export const updateListStatusInput = z.object({
  listId: cuidSchema,
  status: listStatusEnum,
});
export const shareListInput = z.object({
  listId: cuidSchema,
  emailOrId: emailOrIdSchema,
  role: memberRoleEnum,
});
export const unshareListInput = z.object({
  listId: cuidSchema,
  userId: cuidSchema,
});
export const reorderInput = z.object({
  listId: cuidSchema,
  orderedIds: orderedIdsSchema,
});

export const signInClerkInput = z.object({ sessionToken: idTokenSchema });

export const registerPushInput = z.object({
  token: pushTokenSchema,
  platform: pushPlatformEnum.optional(),
});

export const registerWebPushInput = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
});

export const unregisterWebPushInput = z.object({
  endpoint: z.string().url().max(2048),
});
