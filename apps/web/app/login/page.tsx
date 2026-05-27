import { auth, signIn } from "@/auth";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    return (
      <>
        <p className="text-gray-700">
          Vous êtes déjà connecté en tant que <strong>{session.user.email}</strong>.
        </p>
        <a href="/" className="mt-3 text-sm text-blue-600 hover:underline">
          Retour à l&apos;accueil
        </a>
      </>
    );
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
          className="px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-700"
        >
          Se connecter avec Google
        </button>
      </form>
    </>
  );
}
