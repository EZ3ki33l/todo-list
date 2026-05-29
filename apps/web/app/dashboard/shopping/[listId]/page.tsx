import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ShoppingListDetail } from "@/components/shopping-list-detail";

interface Props {
  params: Promise<{ listId: string }>;
}

export default async function ShoppingListPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { listId } = await params;

  return <ShoppingListDetail listId={listId} userId={session.user.id} />;
}
