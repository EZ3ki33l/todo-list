import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ShoppingHub } from "@/components/shopping-hub";

export default async function ShoppingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Mes courses</h1>
      <ShoppingHub userId={session.user.id} />
    </>
  );
}
