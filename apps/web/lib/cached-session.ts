import { issueJwt } from "@repo/api/server";
import { cache } from "react";

import { auth } from "@/auth";

/** JWT + session mis en cache pour la durée de la requête RSC (évite re-signatures). */
export const getCachedAuthSession = cache(async () => {
  const session = await auth();
  const token = session?.user?.id ? await issueJwt(session.user.id) : null;
  return { session, token };
});
