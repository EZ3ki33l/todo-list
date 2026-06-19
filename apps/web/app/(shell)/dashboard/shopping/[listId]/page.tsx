import { redirect } from "next/navigation";

import { getAppUser } from "@/lib/app-session";
import { prisma } from "@repo/db";
import { ShoppingListDetail } from "@/components/shopping-list-detail";
import { getOrCreatePersonalShoppingList } from "@/lib/default-lists";

export default async function ShoppingListPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  const user = await getAppUser();
  if (!user) redirect("/login");

  const personalShopping = await getOrCreatePersonalShoppingList(user.id);
  if (listId === personalShopping.id) redirect("/dashboard/shopping");

  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    include: { members: { where: { userId: user.id } } },
  });

  if (!list) redirect("/dashboard/shopping");

  const isOwner = list.ownerId === user.id;
  const membership = list.members[0];
  if (!isOwner && !membership) redirect("/dashboard/shopping");

  return (
    <ShoppingListDetail listId={listId} userId={user.id} />
  );
}
