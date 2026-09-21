import { notFound, redirect } from "next/navigation";
import { requireView } from "@/lib/guard";
import { canManage } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, fmtNum, fmtDate } from "@/components/ui";
import { getRmStock } from "@/lib/stock";
import { updateMaterial, setMaterialStatus } from "../actions";

export default async function MaterialDetailPage({ params }: { params: { id: string } }) {
  const user = await requireView("materials");
  const manage = canManage(user.role, "materials");

  const m = await prisma.rawMaterial.findUnique({ where: { id: params.id } });
  if (!m) notFound();

  const stock = await getRmStock(m.id);
  const recentMovements = await prisma.rMMovement.findMany({
    where: { rawMaterialId: m.id },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  async function updateAction(formData: FormData) {
    "use server";
    await updateMaterial(params.id, formData);
  }

  async function toggleStatus() {
    "use server";
    await setMaterialStatus(params.id, m!.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
    redirect(`/materials/${params.id}`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={m.name}
        description={`Code: ${m.code}`}
        actions={<StatusBadge status={m.status} />}
      />

      <div className="card p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current Stock</p>
        <p className={`mt-1 text-2xl font-semibold ${stock < m.minimumStock ? "text-red-600" : "text-slate-900"}`}>
          {fmtNum(stock, 2)} {m.unit}
        </p>
        {stock < m.minimumStock && (
          <p className="mt-1 text-xs text-red-600">Below minimum stock threshold ({fmtNum(m.minimumStock, 2)} {m.unit})</p>
        )}
      </div>

      <form action={updateAction} className="card space-y-4 p-6">
        <div>
          <label className="label">Material Name</label>
          <input name="name" defaultValue={m.name} disabled={!manage} className="input" />
        </div>
        <div>
          <label className="label">Category</label>
          <input name="category" defaultValue={m.category ?? ""} disabled={!manage} className="input" />
        </div>
        <div>
          <label className="label">Unit</label>
          <input name="unit" defaultValue={m.unit} disabled={!manage} className="input" />
        </div>
        <div>
          <label className="label">Minimum Stock</label>
          <input name="minimumStock" type="number" step="0.01" defaultValue={m.minimumStock} disabled={!manage} className="input" />
        </div>
        {manage && (
          <button type="submit" className="btn-primary">
            Save changes
          </button>
        )}
      </form>

      {manage && (
        <form action={toggleStatus} className="card p-6">
          <button type="submit" className={m.status === "ACTIVE" ? "btn-danger" : "btn-primary"}>
            {m.status === "ACTIVE" ? "Deactivate material" : "Reactivate material"}
          </button>
        </form>
      )}

      <div className="card p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent Movements</h2>
        {recentMovements.length === 0 ? (
          <p className="text-sm text-slate-400">No movements recorded.</p>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {recentMovements.map((mv) => (
                <tr key={mv.id}>
                  <td>{fmtDate(mv.createdAt)}</td>
                  <td>
                    <StatusBadge status={mv.type} />
                  </td>
                  <td>{fmtNum(mv.qty, 2)}</td>
                  <td>{mv.reference ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
