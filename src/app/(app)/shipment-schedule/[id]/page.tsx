import { notFound } from "next/navigation";
import Link from "next/link";
import { requireView } from "@/lib/guard";
import { canManage } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, fmtDate, fmtNum } from "@/components/ui";
import { confirmShipmentDate } from "../actions";

export default async function ShipmentDetailPage({ params }: { params: { id: string } }) {
  const user = await requireView("shipment_schedule");
  const manage = canManage(user.role, "shipment_schedule");

  const shipment = await prisma.shipment.findUnique({
    where: { id: params.id },
    include: {
      distributor: true,
      po: true,
      items: { include: { product: true } },
      deliveryOrder: true,
    },
  });
  if (!shipment) notFound();

  async function confirmAction(formData: FormData) {
    "use server";
    await confirmShipmentDate(params.id, formData);
  }

  const totalCtn = shipment.items.reduce((s, i) => s + i.qtyCtn, 0);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={`Shipment — ${shipment.po.poNumber}`}
        description={shipment.distributor.companyName}
        actions={<StatusBadge status={shipment.status} />}
      />

      <div className="card space-y-4 p-6">
        <table className="table-base">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>CTN</th>
            </tr>
          </thead>
          <tbody>
            {shipment.items.map((it) => (
              <tr key={it.id}>
                <td className="font-mono text-xs">{it.product.sku}</td>
                <td>{it.product.productName}</td>
                <td>{fmtNum(it.qtyCtn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm text-slate-500">Total: {fmtNum(totalCtn)} CTN</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase text-slate-400">Requested Shipping Date</p>
            <p>{fmtDate(shipment.requestedShippingDate)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Confirmed Shipping Date</p>
            <p>{fmtDate(shipment.confirmedShippingDate)}</p>
          </div>
        </div>
      </div>

      {manage && (
        <form action={confirmAction} className="card space-y-3 p-6">
          <label className="label">Confirm / change shipment date</label>
          <div className="flex gap-2">
            <input
              name="confirmedShippingDate"
              type="date"
              required
              defaultValue={shipment.confirmedShippingDate?.toISOString().slice(0, 10)}
              className="input"
            />
            <button type="submit" className="btn-primary">
              Confirm
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Confirming feeds PPIC's Production Requirement. Date changes are auditable.
          </p>
        </form>
      )}

      <div className="flex gap-3">
        <Link href={`/po/${shipment.poId}`} className="text-sm font-medium text-brand-600 hover:underline">
          ← View PO {shipment.po.poNumber}
        </Link>
        {shipment.deliveryOrder && (
          <Link href={`/delivery-orders/${shipment.deliveryOrder.id}`} className="text-sm font-medium text-brand-600 hover:underline">
            View Delivery Order →
          </Link>
        )}
      </div>
    </div>
  );
}
