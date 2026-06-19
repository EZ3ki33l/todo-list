import { createClerkClient } from "@clerk/backend";

import { prisma } from "@repo/db";

export function getClerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY manquant");
  }
  return createClerkClient({ secretKey });
}

function clerkClient() {
  return getClerkClient();
}

export async function userHasGoogleAccount(clerkUserId: string): Promise<boolean> {
  const cu = await clerkClient().users.getUser(clerkUserId);
  return cu.externalAccounts.some(
    (account) => account.provider === "google" || account.provider === "oauth_google",
  );
}

/** Résout ou crée l'utilisateur Prisma à partir d'un ID Clerk. */
export async function ensureUserFromClerk(clerkUserId: string) {
  const byClerk = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
  if (byClerk) return byClerk;

  const cu = await clerkClient().users.getUser(clerkUserId);
  const email =
    cu.emailAddresses.find((entry) => entry.id === cu.primaryEmailAddressId)?.emailAddress ??
    cu.emailAddresses[0]?.emailAddress;
  const name =
    [cu.firstName, cu.lastName].filter(Boolean).join(" ").trim() ||
    cu.username ||
    null;
  const image = cu.imageUrl || null;

  if (email) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      return prisma.user.update({
        where: { id: byEmail.id },
        data: {
          clerkId: clerkUserId,
          name: name ?? byEmail.name,
          image: image ?? byEmail.image,
          emailVerified: byEmail.emailVerified ?? new Date(),
        },
      });
    }
  }

  return prisma.user.create({
    data: {
      clerkId: clerkUserId,
      email: email ?? `${clerkUserId}@users.clerk`,
      name,
      image,
      emailVerified: email ? new Date() : null,
    },
  });
}
