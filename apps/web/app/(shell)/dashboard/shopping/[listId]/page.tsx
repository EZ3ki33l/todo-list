import { redirect } from "next/navigation";

import { parseListId } from "@repo/api";
import { getAppUser } from "@/lib/app-session";
import { prisma } from "@repo/db";
import { ShoppingListDetail } from "@/components/shopping-list-detail";
import { getOrCreatePersonalShoppingList } from "@repo/api/lib/default-lists";

export default async function ShoppingListPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId: rawListId } = await params;

  // Rejette immédiatement les IDs malformés avant toute requête Prisma.
  let listId: string;
  try {
    listId = parseListId(rawListId);
  } catch {
    redirect("/dashboard/shopping");
  }

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
