import { TrpcProvider } from "@/components/trpc-provider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <TrpcProvider>{children}</TrpcProvider>;
}
