import { redirect } from "next/navigation";
import { requireFreshUser, type SessionUser } from "@/lib/auth";
import { canView, canManage, type ModuleKey } from "@/lib/rbac";

/**
 * Use at the top of a page.tsx (Server Component) to require a logged-in,
 * active user who may VIEW the module. Redirects to /login if no session
 * (middleware normally catches this first, but pages stay safe if called
 * directly), or to /dashboard with a denial if the role can't view.
 */
export async function requireView(mod: ModuleKey): Promise<SessionUser> {
  let user: SessionUser;
  try {
    user = await requireFreshUser();
  } catch {
    redirect("/login");
  }
  if (!canView(user.role, mod)) {
    redirect("/dashboard?denied=" + mod);
  }
  return user;
}

/** Use at the top of a server action to require MANAGE rights. Throws (does not redirect) so the caller can surface a form error. */
export async function requireManage(mod: ModuleKey): Promise<SessionUser> {
  const user = await requireFreshUser();
  if (!canManage(user.role, mod)) {
    throw new Error(`Forbidden: your role (${user.role}) cannot manage ${mod}`);
  }
  return user;
}

export type { ModuleKey };
