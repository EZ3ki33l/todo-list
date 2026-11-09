import { redirect } from "next/navigation";

import { RecipeCatalogDetail } from "@/components/recipe-catalog-detail";
import { getAppUser } from "@/lib/app-session";

export default async function CatalogMealPage({
  params,
}: {
  params: Promise<{ mealId: string }>;
}) {
  const { mealId } = await params;

  const user = await getAppUser();
  if (!user) redirect("/login");

  return <RecipeCatalogDetail mealId={mealId} />;
}
