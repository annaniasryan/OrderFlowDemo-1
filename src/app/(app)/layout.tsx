import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { navForRole } from "@/lib/nav";
import { ROLE_LABELS } from "@/lib/rbac";
import Sidebar from "@/components/sidebar";
import NavDrawer from "@/components/nav-drawer";
import { logoutAction } from "./logout-action";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const groups = navForRole(user.role);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar. Hidden on phones and tablets — NavDrawer covers those. */}
      <aside className="hidden w-64 shrink-0 flex-col bg-brand-800 px-4 py-6 lg:flex">
        <div className="mb-8 px-2">
          <p className="text-lg font-bold text-white">OrderFlow</p>
          <p className="text-xs text-brand-200">v4.0 Operational Workflow</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Sidebar groups={groups} />
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Sticky so the menu and sign-out stay reachable after scrolling. */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <NavDrawer groups={groups} />
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-800">{user.fullName}</p>
              <p className="text-xs text-slate-400">{ROLE_LABELS[user.role]}</p>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="btn-secondary text-xs">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 bg-slate-50 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
