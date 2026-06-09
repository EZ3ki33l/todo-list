import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

export async function HomeGate() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <>
      <h1 className="text-3xl font-bold">Todo list</h1>
      <p className="mt-2 text-gray-600">
        Connectez-vous pour accéder à vos tâches et listes de courses.
      </p>
      <Link
        href="/login"
        className="mt-4 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700"
      >
        Se connecter
      </Link>
    </>
  );
}
