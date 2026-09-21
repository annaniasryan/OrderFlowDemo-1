import { requireView } from "@/lib/guard";
import { canManage } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState, StatusBadge, fmtDate, fmtNum } from "@/components/ui";
import { getFgStockMap } from "@/lib/stock";
import { receiveProductionActual, recordFgMovement } from "./actions";

export default async function FgInventoryPage() {
  const user = await requireView("fg_inventory");
  const manage = canManage(user.role, "fg_inventory");

  const [products, stockMap, pendingReceipts, recentMovements] = await Promise.all([
    prisma.product.findMany({ where: { status: "ACTIVE" }, orderBy: { productName: "asc" } }),
    getFgStockMap(),
    prisma.productionActual.findMany({
      where: { status: "COMPLETED", receivedToWarehouse: false },
      include: { product: true },
      orderBy: { productionDate: "asc" },
    }),
    prisma.fGMovement.findMany({
      include: { product: true },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  async function receiveAction(formData: FormData) {
    "use server";
    await receiveProductionActual(String(formData.get("actualId")));
  }
  async function movementAction(formData: FormData) {
    "use server";
    await recordFgMovement(formData);
  }

  return (
    <div className="space-y-8">
      <div>
        <PageHeader title="Finished Goods Inventory" description="Finished-product stock using auditable movements in CTN." />
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Current Stock (CTN)</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.sku}</td>
                  <td className="font-medium text-slate-900">{p.productName}</td>
                  <td>{fmtNum(stockMap[p.id] ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {manage && pendingReceipts.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Pending Receiving from Production</h2>
          <div className="card divide-y divide-slate-100">
            {pendingReceipts.map((r) => (
              <form key={r.id} action={receiveAction} className="flex items-center justify-between px-4 py-3 text-sm">
                <input type="hidden" name="actualId" value={r.id} />
                <span>
                  {r.product.productName} — {fmtNum(r.goodOutputCtn)} CTN good output ({fmtDate(r.productionDate)})
                </span>
                <button type="submit" className="btn-primary text-xs">
                  Receive
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      {manage && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Record Movement</h2>
          <form action={movementAction} className="card flex flex-wrap items-end gap-3 p-6">
            <div>
              <label className="label">Type</label>
              <select name="type" required className="input">
                <option value="IN">Product In</option>
                <option value="OUT">Product Out</option>
                <option value="RETURN">Return</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </select>
            </div>
            <div>
              <label className="label">Product</label>
              <select name="productId" required className="input">
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Qty CTN</label>
              <input name="qtyCtn" type="number" step="1" required className="input w-28" />
            </div>
            <div>
              <label className="label">Reference (PO/DO)</label>
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
                  <th>Product</th>
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
                    <td>{m.product.sku}</td>
                    <td>{fmtNum(m.qtyCtn)}</td>
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
