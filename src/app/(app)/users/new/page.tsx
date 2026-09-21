import { requireView } from "@/lib/guard";
import { canManage, ALL_ROLES, ROLE_LABELS } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { createUser } from "../actions";

export default async function NewUserPage() {
  const user = await requireView("users");
  if (!canManage(user.role, "users")) redirect("/users");

  const distributors = await prisma.distributor.findMany({
    where: { status: "ACTIVE" },
    orderBy: { companyName: "asc" },
  });

  return (
    <div className="max-w-xl">
      <PageHeader title="Create User" description="Only Super Admin can create or manage users." />
      <form action={createUser} className="card space-y-4 p-6">
        <div>
          <label className="label">Full Name</label>
          <input name="fullName" required className="input" />
        </div>
        <div>
          <label className="label">Username / Email</label>
          <input name="email" type="email" required className="input" />
        </div>
        <div>
          <label className="label">Division</label>
          <input name="division" className="input" />
        </div>
        <div>
          <label className="label">Role</label>
          <select name="role" required className="input" defaultValue="">
            <option value="" disabled>
              Select a role
            </option>
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Linked Distributor (only for Distributor role)</label>
          <select name="distributorId" className="input" defaultValue="">
            <option value="">— None —</option>
            {distributors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.companyName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Temporary Password</label>
          <input name="password" className="input" placeholder="password123 (default)" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary">
            Create user
          </button>
        </div>
      </form>
    </div>
  );
}
