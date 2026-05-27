import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";

import type { AppRouter } from "@repo/api";

export const trpc = createTRPCReact<AppRouter>();

export function createTrpcClient(getToken: () => string | null) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${process.env.EXPO_PUBLIC_API_URL}/api/trpc`,
        headers() {
          const token = getToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
