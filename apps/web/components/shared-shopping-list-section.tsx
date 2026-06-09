"use client";

import { ShoppingListDetail } from "@/components/shopping-list-detail";

export function SharedShoppingListSection({
  listId,
  userId,
  ownerLabel,
}: {
  listId: string;
  userId: string;
  ownerLabel: string;
}) {
  return (
    <ShoppingListDetail
      listId={listId}
      userId={userId}
      embedded
      shared
      ownerLabel={ownerLabel}
      sectionId={`shared-shopping-${listId}`}
    />
  );
}
