import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink, httpLink, splitLink } from "@trpc/client";

import type { AppRouter } from "@repo/api";

export const trpc = createTRPCReact<AppRouter>();

function authHeaders(getToken: () => string | null) {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function createTrpcClient(getToken: () => string | null) {
  const url = `${process.env.EXPO_PUBLIC_API_URL}/api/trpc`;

  return trpc.createClient({
    links: [
      splitLink({
        condition(op) {
          return op.type === "mutation";
        },
        true: httpLink({
          url,
          headers() {
            return authHeaders(getToken);
          },
        }),
        false: httpBatchLink({
          url,
          headers() {
            return authHeaders(getToken);
          },
        }),
      }),
    ],
  });
}
