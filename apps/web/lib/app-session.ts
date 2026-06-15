import { ensureUserFromClerk } from "@repo/api/server";
import { auth } from "@clerk/nextjs/server";
import { cache } from "react";

/** Utilisateur Prisma lié à la session Clerk (cache par requête RSC). */
export const getAppUser = cache(async () => {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;
  return ensureUserFromClerk(clerkUserId);
});
