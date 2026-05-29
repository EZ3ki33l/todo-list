import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ShoppingListDetail } from "@/components/shopping-list-detail";
import { usePersonalShoppingList } from "@/lib/use-personal-shopping-list";

export default function ShoppingListDetailScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const router = useRouter();
  const { list: personalList } = usePersonalShoppingList();

  useEffect(() => {
    if (personalList && listId === personalList.id) {
      router.replace("/(app)/shopping");
    }
  }, [personalList, listId, router]);

  if (!listId) return null;

  return <ShoppingListDetail listId={listId} />;
}
