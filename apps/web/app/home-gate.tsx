import Link from "next/link";
import { redirect } from "next/navigation";

import { getAppUser } from "@/lib/app-session";

export async function HomeGate() {
  const user = await getAppUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-app-text">Todo list</h1>
      <p className="mt-2 text-app-text-muted">
        Connectez-vous pour accéder à vos tâches et listes de courses.
      </p>
      <Link
        href="/login"
        className="mt-4 inline-block rounded-md bg-app-primary px-4 py-2 text-sm text-app-on-primary hover:opacity-90"
      >
        Se connecter
      </Link>
    </>
  );
}
