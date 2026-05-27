-- CreateEnum
CREATE TYPE "ListStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DONE');

-- AlterTable
ALTER TABLE "TodoList" ADD COLUMN "status" "ListStatus" NOT NULL DEFAULT 'ACTIVE';
