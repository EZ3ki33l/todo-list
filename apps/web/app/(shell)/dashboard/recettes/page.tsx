import { redirect } from "next/navigation";

import { RecipeBook } from "@/components/recipe-book";
import { getAppUser } from "@/lib/app-session";

export default async function RecipesPage() {
  const user = await getAppUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-lg font-semibold text-app-text">Mes recettes</h1>
        <p className="mt-0.5 text-sm text-app-text-subtle">
          Votre carnet, et le catalogue TheMealDB pour découvrir de nouveaux plats.
        </p>
      </header>

      <RecipeBook />
    </div>
  );
}
