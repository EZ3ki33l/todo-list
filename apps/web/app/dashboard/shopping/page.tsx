import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CreateSharedListForm } from "@/components/create-shared-list-form";
import { ListLinkCard } from "@/components/list-link-card";
import { ShoppingListDetail } from "@/components/shopping-list-detail";
import { ShoppingRecipeIdeas } from "@/components/shopping-recipe-ideas";
import {
  getOrCreatePersonalShoppingList,
  getSharedShoppingLists,
} from "@/lib/default-lists";
import { shoppingCountsByListId } from "@/lib/batch-list-stats";
import { prisma } from "@repo/db";

function ownerSubtitle(
  isOwner: boolean,
  memberCount: number,
  ownerName: string | null | undefined,
  ownerEmail: string | null | undefined,
) {
  if (isOwner) {
    return memberCount > 0
      ? "Vous êtes propriétaire"
      : "Ajoutez des membres depuis la liste";
  }
  return `Avec ${ownerName ?? ownerEmail ?? "quelqu'un"}`;
}

function itemsSubtitle(total: number, unchecked: number) {
  if (total === 0) return "Liste vide";
  if (unchecked === 0) return `${total} article${total > 1 ? "s" : ""} · tout coché`;
  return `${unchecked} à acheter · ${total} article${total > 1 ? "s" : ""}`;
}

export default async function ShoppingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const personalShopping = await getOrCreatePersonalShoppingList(userId);
  const sharedShopping = await getSharedShoppingLists(userId, personalShopping.id);

  const sharedListIds = sharedShopping.map((l) => l.id);
  const countGroups =
    sharedListIds.length > 0
      ? await prisma.shoppingItem.groupBy({
          by: ["listId", "checked"],
          where: { listId: { in: sharedListIds } },
          _count: { _all: true },
        })
      : [];
  const countsByListId = shoppingCountsByListId(sharedListIds, countGroups);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
      </header>

      <ShoppingListDetail
        listId={personalShopping.id}
        userId={userId}
        embedded
      />

      <ShoppingRecipeIdeas listId={personalShopping.id} />

      <section id="listes-partagees" className="scroll-mt-8 space-y-3">
        <h2 className="text-sm font-semibold text-gray-500">Listes partagées</h2>
        {sharedShopping.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune liste de courses partagée.</p>
        ) : (
          <ul className="space-y-2">
            {sharedShopping.map((list) => {
              const isOwner = list.ownerId === userId;
              const counts = countsByListId.get(list.id) ?? { total: 0, unchecked: 0 };
              return (
                <li key={list.id}>
                  <ListLinkCard
                    href={`/dashboard/shopping/${list.id}`}
                    title={list.title}
                    subtitle={`${itemsSubtitle(counts.total, counts.unchecked)} · ${ownerSubtitle(
                      isOwner,
                      list._count.members,
                      list.owner.name,
                      list.owner.email,
                    )}`}
                    shared
                  />
                </li>
              );
            })}
          </ul>
        )}
        <CreateSharedListForm kind="shopping" placeholder="Ex. Courses du chalet…" />
      </section>
    </div>
  );
}
