import { notFound } from "next/navigation";
import { requireView } from "@/lib/guard";
import { canManage } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, fmtDate } from "@/components/ui";
import { completeActual } from "../actions";

export default async function ActualDetailPage({ params }: { params: { id: string } }) {
  const user = await requireView("production_actual");
  const manage = canManage(user.role, "production_actual");

  const a = await prisma.productionActual.findUnique({
    where: { id: params.id },
    include: { product: true, schedule: true },
  });
  if (!a) notFound();

  async function completeAction(formData: FormData) {
    "use server";
    await completeActual(params.id, formData);
  }

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader
        title={a.product.productName}
        description={`Scheduled ${a.schedule.plannedCtn} CTN — ${a.schedule.line}/${a.schedule.shift}`}
        actions={<StatusBadge status={a.status} />}
      />

      {a.status === "COMPLETED" ? (
        <div className="card space-y-2 p-6 text-sm">
          <p>Actual: {a.actualCtn} CTN</p>
          <p>Reject: {a.rejectCtn} CTN</p>
          <p className="font-semibold">Good Output: {a.goodOutputCtn} CTN</p>
          <p>Batch: {a.batch ?? "—"}</p>
          <p>Expiry: {fmtDate(a.expiryDate)}</p>
          <p className="text-xs text-slate-400">
            {a.receivedToWarehouse
              ? "Received into Finished Goods Inventory."
              : "Awaiting Product Warehouse receiving transaction."}
          </p>
        </div>
      ) : manage ? (
        <form action={completeAction} className="card space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Actual Quantity (CTN)</label>
              <input name="actualCtn" type="number" step="1" min="0" required className="input" />
            </div>
            <div>
              <label className="label">Reject Quantity (CTN)</label>
              <input name="rejectCtn" type="number" step="1" min="0" defaultValue={0} required className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Batch / Lot</label>
              <input name="batch" defaultValue={a.batch ?? ""} className="input" />
            </div>
            <div>
              <label className="label">Expiry Date</label>
              <input
                name="expiryDate"
                type="date"
                defaultValue={a.expiryDate ? a.expiryDate.toISOString().slice(0, 10) : ""}
                className="input"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary">
            Complete production
          </button>
          <p className="text-xs text-slate-400">Good Output = Actual Production − Reject.</p>
        </form>
      ) : (
        <p className="text-sm text-slate-400">Awaiting Head Production to enter results.</p>
      )}
    </div>
  );
}
