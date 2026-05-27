import Link from "next/link";

import { auth, signIn, signOut } from "@/auth";

export async function SessionNav() {
  const session = await auth();

  if (!session?.user) {
    return (
      <>
        <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
          Connexion
        </Link>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="text-sm px-3 py-1.5 rounded-md bg-gray-900 text-white hover:bg-gray-700"
          >
            Se connecter avec Google
          </button>
        </form>
      </>
    );
  }

  return (
    <>
      <span className="text-sm text-gray-600">
        {session.user.email ?? session.user.name}
      </span>
      <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
        Tableau de bord
      </Link>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-100"
        >
          Déconnexion
        </button>
      </form>
    </>
  );
}
