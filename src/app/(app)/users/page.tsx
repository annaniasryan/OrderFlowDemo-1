import Link from "next/link";
import { requireView } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui";
import { ROLE_LABELS, canManage } from "@/lib/rbac";

export default async function UsersPage() {
  const user = await requireView("users");
  const users = await prisma.user.findMany({
    include: { distributor: true },
    orderBy: { createdAt: "desc" },
  });
  const manage = canManage(user.role, "users");

  return (
    <div>
      <PageHeader
        title="User & Access Management"
        description="Control who can access OrderFlow and what each role can do."
        actions={
          manage ? (
            <Link href="/users/new" className="btn-primary">
              + Create user
            </Link>
          ) : undefined
        }
      />

      <div className="card overflow-x-auto">
        {users.length === 0 ? (
          <EmptyState message="No users yet." />
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Division</th>
                <th>Role</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium text-slate-900">{u.fullName}</td>
                  <td>{u.email}</td>
                  <td>{u.division ?? "—"}</td>
                  <td>
                    {ROLE_LABELS[u.role]}
                    {u.distributor && <span className="text-xs text-slate-400"> ({u.distributor.companyName})</span>}
                  </td>
                  <td>
                    <StatusBadge status={u.status} />
                  </td>
                  <td>
                    <Link href={`/users/${u.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
