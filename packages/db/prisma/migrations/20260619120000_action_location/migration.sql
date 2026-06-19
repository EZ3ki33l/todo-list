-- Lieu optionnel sur les actions (étiquette + adresse pour navigation)
ALTER TABLE "Action" ADD COLUMN "locationLabel" TEXT;
ALTER TABLE "Action" ADD COLUMN "locationAddress" TEXT;
