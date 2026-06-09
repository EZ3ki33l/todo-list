import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@repo/db";
import { ShoppingListDetail } from "@/components/shopping-list-detail";
import { getOrCreatePersonalShoppingList } from "@/lib/default-lists";

export default async function ShoppingListPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const personalShopping = await getOrCreatePersonalShoppingList(session.user.id);
  if (listId === personalShopping.id) redirect("/dashboard/shopping");

  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    include: { members: { where: { userId: session.user.id } } },
  });

  if (!list) redirect("/dashboard/shopping");

  const isOwner = list.ownerId === session.user.id;
  const membership = list.members[0];
  if (!isOwner && !membership) redirect("/dashboard/shopping");

  return (
    <ShoppingListDetail listId={listId} userId={session.user.id} />
  );
}
