import { redirect } from "next/navigation";

import { RecipeDetail } from "@/components/recipe-detail";
import { getAppUser } from "@/lib/app-session";

export default async function RecipePage({
  params,
}: {
  params: Promise<{ recipeId: string }>;
}) {
  const { recipeId } = await params;

  const user = await getAppUser();
  if (!user) redirect("/login");

  return <RecipeDetail recipeId={recipeId} />;
}
