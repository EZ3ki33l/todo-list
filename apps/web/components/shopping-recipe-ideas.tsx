"use client";

import { RecipeChefChat } from "@/components/recipe-chef-chat";

type Props = {
  listId: string;
};

export function ShoppingRecipeIdeas({ listId }: Props) {
  return <RecipeChefChat listId={listId} />;
}
