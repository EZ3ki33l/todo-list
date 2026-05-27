import { redirect } from "next/navigation";

import { auth } from "@/auth";
import DayWeekView from "@/components/day-week-view";
import TodoDashboard from "@/components/todo-dashboard";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) redirect("/login");

  return (
    <>
      <DayWeekView userId={session.user.id} />
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Mes listes</h1>
      <TodoDashboard userId={session.user.id} />
    </>
  );
}
