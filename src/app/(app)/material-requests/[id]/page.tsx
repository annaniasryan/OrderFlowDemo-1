import { notFound } from "next/navigation";
import { requireView } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, fmtDate, fmtNum } from "@/components/ui";
import { processRequest, markIncoming, markAvailable, receiveAndClose } from "../actions";

export default async function MaterialRequestDetailPage({ params }: { params: { id: string } }) {
  const user = await requireView("material_request");

  const r = await prisma.materialRequest.findUnique({
    where: { id: params.id },
    include: { rawMaterial: true },
  });
  if (!r) notFound();

  const isPurchasing = user.role === "PURCHASING" || user.role === "SUPER_ADMIN";
  const isWarehouse = user.role === "RAW_MATERIAL_WAREHOUSE" || user.role === "SUPER_ADMIN";

  async function processAction() {
    "use server";
    await processRequest(params.id);
  }
  async function incomingAction(formData: FormData) {
    "use server";
    await markIncoming(params.id, formData);
  }
  async function availableAction() {
    "use server";
    await markAvailable(params.id);
  }
  async function receiveAction(formData: FormData) {
    "use server";
    await receiveAndClose(params.id, formData);
  }

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader
        title={r.requestNumber}
        description={r.rawMaterial.name}
        actions={<StatusBadge status={r.status} />}
      />

      <div className="card space-y-2 p-6 text-sm">
        <p>Stock at request time: {fmtNum(r.currentStockAtRequest, 2)} {r.rawMaterial.unit}</p>
        <p>Requested quantity: {fmtNum(r.requestedQty, 2)} {r.rawMaterial.unit}</p>
        <p>Required date: {fmtDate(r.requiredDate)}</p>
        {r.reason && <p>Reason: {r.reason}</p>}
        {r.incomingQty ? <p>Incoming quantity: {fmtNum(r.incomingQty, 2)} {r.rawMaterial.unit}</p> : null}
        {r.expectedAvailabilityDate && <p>Expected availability: {fmtDate(r.expectedAvailabilityDate)}</p>}
      </div>

      {isPurchasing && r.status === "REQUESTED" && (
        <form action={processAction} className="card p-6">
          <button type="submit" className="btn-primary">
            Acknowledge / Start processing
          </button>
        </form>
      )}

      {isPurchasing && ["PROCESSING", "INCOMING"].includes(r.status) && (
        <form action={incomingAction} className="card space-y-3 p-6">
          <label className="label">Mark incoming</label>
          <div className="flex gap-2">
            <input name="incomingQty" type="number" step="0.01" placeholder="Incoming qty" required className="input" />
            <input name="expectedAvailabilityDate" type="date" className="input" />
            <button type="submit" className="btn-secondary">
              Save
            </button>
          </div>
        </form>
      )}

      {isPurchasing && r.status === "INCOMING" && (
        <form action={availableAction} className="card p-6">
          <button type="submit" className="btn-primary">
            Mark available
          </button>
        </form>
      )}

      {isWarehouse && ["AVAILABLE", "INCOMING"].includes(r.status) && (
        <form action={receiveAction} className="card space-y-3 p-6">
          <label className="label">Receive into Raw Material Inventory</label>
          <div className="flex gap-2">
            <input
              name="receivedQty"
              type="number"
              step="0.01"
              defaultValue={r.incomingQty ?? r.requestedQty}
              required
              className="input"
            />
            <button type="submit" className="btn-primary">
              Receive &amp; close
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Creates a Material In movement in Raw Material Inventory and closes this request.
          </p>
        </form>
      )}

      <p className="text-xs text-slate-400">Supplier PO creation itself remains outside OrderFlow.</p>
    </div>
  );
}
