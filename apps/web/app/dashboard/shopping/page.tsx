import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CreateSharedListForm } from "@/components/create-shared-list-form";
import { ListLinkCard } from "@/components/list-link-card";
import { ShoppingListDetail } from "@/components/shopping-list-detail";
import {
  getOrCreatePersonalShoppingList,
  getSharedShoppingLists,
} from "@/lib/default-lists";
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

  const sharedCounts = await Promise.all(
    sharedShopping.map((list) =>
      prisma.shoppingItem.groupBy({
        by: ["checked"],
        where: { listId: list.id },
        _count: { _all: true },
      }),
    ),
  );

  function countUnchecked(groups: { checked: boolean; _count: { _all: number } }[]) {
    const total = groups.reduce((n, g) => n + g._count._all, 0);
    const unchecked = groups.find((g) => !g.checked)?._count._all ?? 0;
    return { total, unchecked };
  }

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

      <section id="listes-partagees" className="scroll-mt-8 space-y-3">
        <h2 className="text-sm font-semibold text-gray-500">Listes partagées</h2>
        {sharedShopping.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune liste de courses partagée.</p>
        ) : (
          <ul className="space-y-2">
            {sharedShopping.map((list, index) => {
              const isOwner = list.ownerId === userId;
              const counts = countUnchecked(sharedCounts[index] ?? []);
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
