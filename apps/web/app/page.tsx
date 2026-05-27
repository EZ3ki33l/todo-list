import { auth } from "@/auth";
import TodoDashboard from "@/components/todo-dashboard";

export default async function Web() {
  const session = await auth();

  return (
    <>
      <h1 className="text-3xl font-bold">Todo list</h1>
      {session?.user ? (
        <div> <p className="mt-2 text-gray-600">Bienvenue sur votre tableau de bord, {session.user.name}.</p>
        <TodoDashboard userId={session.user.id} />
        </div>
      ) : (
        <p className="mt-2 text-gray-600">Connectez-vous pour accéder à vos listes.</p>
      )}
    </>
  );
}
