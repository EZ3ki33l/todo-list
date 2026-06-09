import { issueJwt } from "@repo/api";

import { auth } from "@/auth";
import { TrpcProvider } from "@/components/trpc-provider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const initialToken = session?.user?.id ? await issueJwt(session.user.id) : null;

  return <TrpcProvider initialToken={initialToken}>{children}</TrpcProvider>;
}
