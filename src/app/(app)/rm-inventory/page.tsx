import Link from "next/link";
import { requireView } from "@/lib/guard";
import { canManage } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState, StatusBadge, fmtDate, fmtNum } from "@/components/ui";
import { getRmStockMap } from "@/lib/stock";
import { recordRmMovement } from "./actions";

export default async function RmInventoryPage() {
  const user = await requireView("rm_inventory");
  const manage = canManage(user.role, "rm_inventory");

  const [materials, stockMap, recentMovements] = await Promise.all([
    prisma.rawMaterial.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    getRmStockMap(),
    prisma.rMMovement.findMany({
      include: { rawMaterial: true },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  async function movementAction(formData: FormData) {
    "use server";
    await recordRmMovement(formData);
  }

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          title="Raw Material Inventory"
          description="Raw-material balances and movements in each material's natural unit."
          actions={
            manage ? (
              <Link href="/material-requests/new" className="btn-secondary">
                + Create material request
              </Link>
            ) : undefined
          }
        />
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Code</th>
                <th>Material</th>
                <th>Current Stock</th>
                <th>Min. Stock</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => {
                const stock = stockMap[m.id] ?? 0;
                const low = stock < m.minimumStock;
                return (
                  <tr key={m.id}>
                    <td className="font-mono text-xs">{m.code}</td>
                    <td className="font-medium text-slate-900">{m.name}</td>
                    <td className={low ? "font-semibold text-red-600" : ""}>
                      {fmtNum(stock, 2)} {m.unit} {low && "⚠"}
                    </td>
                    <td>{fmtNum(m.minimumStock, 2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {manage && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Record Movement</h2>
          <form action={movementAction} className="card flex flex-wrap items-end gap-3 p-6">
            <div>
              <label className="label">Type</label>
              <select name="type" required className="input">
                <option value="IN">Material In</option>
                <option value="OUT">Material Out</option>
                <option value="RETURN">Return</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </select>
            </div>
            <div>
              <label className="label">Material</label>
              <select name="rawMaterialId" required className="input">
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Qty</label>
              <input name="qty" type="number" step="0.01" required className="input w-28" />
            </div>
            <div>
              <label className="label">Reference</label>
              <input name="reference" className="input" />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="label">Notes / Reason</label>
              <input name="notesReason" className="input" />
            </div>
            <button type="submit" className="btn-primary">
              Record
            </button>
          </form>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Movement Ledger</h2>
        <div className="card overflow-x-auto">
          {recentMovements.length === 0 ? (
            <EmptyState message="No movements yet." />
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Material</th>
                  <th>Qty</th>
                  <th>Reference</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {recentMovements.map((m) => (
                  <tr key={m.id}>
                    <td>{fmtDate(m.createdAt)}</td>
                    <td>
                      <StatusBadge status={m.type} />
                    </td>
                    <td>{m.rawMaterial.name}</td>
                    <td>{fmtNum(m.qty, 2)}</td>
                    <td>{m.reference ?? "—"}</td>
                    <td>{m.notesReason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
