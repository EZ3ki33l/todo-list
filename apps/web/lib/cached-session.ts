import { issueJwt } from "@repo/api/server";
import { cache } from "react";

import { getAppUser } from "./app-session";

/** JWT API + profil Prisma mis en cache pour la durée de la requête RSC. */
export const getCachedAuthSession = cache(async () => {
  const user = await getAppUser();
  if (!user) return { session: null, token: null };

  const token = await issueJwt(user.id);
  return {
    session: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    },
    token,
  };
});
