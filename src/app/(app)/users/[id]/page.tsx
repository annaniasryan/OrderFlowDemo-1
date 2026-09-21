import { notFound, redirect } from "next/navigation";
import { requireView } from "@/lib/guard";
import { canManage, ALL_ROLES, ROLE_LABELS } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, fmtDate } from "@/components/ui";
import { updateUser, setUserStatus } from "../actions";
import ResetPasswordButton from "./reset-password-button";

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const viewer = await requireView("users");
  const manage = canManage(viewer.role, "users");

  const u = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      distributor: true,
      loginHistory: { orderBy: { loginAt: "desc" }, take: 10 },
    },
  });
  if (!u) notFound();

  const distributors = await prisma.distributor.findMany({
    where: { status: "ACTIVE" },
    orderBy: { companyName: "asc" },
  });

  async function updateAction(formData: FormData) {
    "use server";
    await updateUser(params.id, formData);
  }

  async function toggleStatus() {
    "use server";
    await setUserStatus(params.id, u!.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
    redirect(`/users/${params.id}`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={u.fullName}
        description={u.email}
        actions={<StatusBadge status={u.status} />}
      />

      <form action={updateAction} className="card space-y-4 p-6">
        <div>
          <label className="label">Full Name</label>
          <input name="fullName" defaultValue={u.fullName} required disabled={!manage} className="input" />
        </div>
        <div>
          <label className="label">Division</label>
          <input name="division" defaultValue={u.division ?? ""} disabled={!manage} className="input" />
        </div>
        <div>
          <label className="label">Role</label>
          <select name="role" defaultValue={u.role} disabled={!manage} className="input">
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Linked Distributor</label>
          <select name="distributorId" defaultValue={u.distributorId ?? ""} disabled={!manage} className="input">
            <option value="">— None —</option>
            {distributors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.companyName}
              </option>
            ))}
          </select>
        </div>
        {manage && (
          <button type="submit" className="btn-primary">
            Save changes
          </button>
        )}
      </form>

      {manage && (
        <div className="card space-y-3 p-6">
          <h2 className="text-sm font-semibold text-slate-700">Access</h2>
          <form action={toggleStatus}>
            <button type="submit" className={u.status === "ACTIVE" ? "btn-danger" : "btn-primary"}>
              {u.status === "ACTIVE" ? "Deactivate user" : "Activate user"}
            </button>
          </form>
          <ResetPasswordButton userId={u.id} />
        </div>
      )}

      <div className="card p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Login History</h2>
        {u.loginHistory.length === 0 ? (
          <p className="text-sm text-slate-400">No logins recorded yet.</p>
        ) : (
          <ul className="space-y-1 text-sm text-slate-600">
            {u.loginHistory.map((h) => (
              <li key={h.id}>{fmtDate(h.loginAt)} at {new Date(h.loginAt).toLocaleTimeString()}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
