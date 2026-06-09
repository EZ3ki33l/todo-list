import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";

export async function LoginGate() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <>
      <h1 className="text-2xl font-bold">Connexion</h1>
      <p className="mt-2 text-gray-600">
        Connectez-vous avec Google pour accéder à vos listes.
      </p>
      <form
        className="mt-4"
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/dashboard" });
        }}
      >
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-gray-700"
        >
          Se connecter avec Google
        </button>
      </form>
    </>
  );
}
