import "dotenv/config";
import { defineConfig } from "prisma/config";

/** URL factice pour `prisma generate` (EAS, Docker build) — pas de connexion réelle. */
const BUILD_DATABASE_URL =
  "postgresql://build:build@127.0.0.1:5432/build?sslmode=require";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? BUILD_DATABASE_URL,
  },
});
