-- Catalogue TheMealDB : source, vignette et id externe (anti-doublon)

ALTER TYPE "RecipeSource" ADD VALUE IF NOT EXISTS 'MEALDB';

ALTER TABLE "Recipe" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "Recipe" ADD COLUMN IF NOT EXISTS "externalId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Recipe_ownerId_externalId_key"
  ON "Recipe"("ownerId", "externalId");
