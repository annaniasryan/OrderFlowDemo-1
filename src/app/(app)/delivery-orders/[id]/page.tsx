import { notFound } from "next/navigation";
import { requireView } from "@/lib/guard";
import { canManage } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, fmtDate, fmtNum } from "@/components/ui";
import PrintButton from "@/components/print-button";
import { recordPrint, completeShipmentOut } from "../actions";

export default async function DODetailPage({ params }: { params: { id: string } }) {
  const user = await requireView("delivery_order");
  const manage = canManage(user.role, "delivery_order");

  const d = await prisma.deliveryOrder.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { product: true } },
      shipment: { include: { distributor: true, po: true } },
    },
  });
  if (!d) notFound();

  async function printAction() {
    "use server";
    await recordPrint(params.id);
  }
  async function completeAction() {
    "use server";
    await completeShipmentOut(params.id);
  }

  return (
    <div className="max-w-2xl space-y-6 print:max-w-full">
      <div className="print:hidden">
        <PageHeader
          title={d.doNumber}
          description={`${d.shipment.po.poNumber} — ${d.shipment.distributor.companyName}`}
          actions={<StatusBadge status={d.shipment.status} />}
        />
      </div>

      <div className="card space-y-4 p-8 print:border-none print:shadow-none">
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-xl font-bold text-slate-900">DELIVERY ORDER</p>
            <p className="font-mono text-sm text-slate-500">{d.doNumber}</p>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>PO Ref: {d.shipment.po.poNumber}</p>
            <p>Shipment Date: {fmtDate(d.shipmentDate)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase text-slate-400">Distributor</p>
            <p className="font-medium">{d.shipment.distributor.companyName}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Delivery Address</p>
            <p>{d.deliveryAddress}</p>
          </div>
        </div>

        <table className="table-base">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Size</th>
              <th>Qty (CTN)</th>
            </tr>
          </thead>
          <tbody>
            {d.items.map((it) => (
              <tr key={it.id}>
                <td className="font-mono text-xs">{it.product.sku}</td>
                <td>{it.product.productName}</td>
                <td>{it.product.size ?? "—"}</td>
                <td>{fmtNum(it.qtyCtn)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid grid-cols-3 gap-4 border-t border-slate-200 pt-4 text-sm">
          <div>
            <p className="text-xs uppercase text-slate-400">Total CTN</p>
            <p className="font-semibold">{fmtNum(d.totalCtn)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Total CBM</p>
            <p className="font-semibold">{fmtNum(d.totalCbm, 3)} m³</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Total Gross Weight</p>
            <p className="font-semibold">{fmtNum(d.totalGrossWeight, 1)} kg</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 pt-10 text-center text-xs text-slate-500">
          <div>
            <p className="mb-8">Prepared By</p>
            <p className="border-t border-slate-300 pt-1">{d.preparedBy ?? "________________"}</p>
          </div>
          <div>
            <p className="mb-8">Warehouse</p>
            <p className="border-t border-slate-300 pt-1">________________</p>
          </div>
          <div>
            <p className="mb-8">Driver</p>
            <p className="border-t border-slate-300 pt-1">________________</p>
          </div>
          <div>
            <p className="mb-8">Received By</p>
            <p className="border-t border-slate-300 pt-1">________________</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        <PrintButton onPrint={printAction} />
        {manage && d.shipment.status === "SHIPPED" && (
          <form action={completeAction}>
            <button type="submit" className="btn-primary">
              Confirm delivered (post Product Out)
            </button>
          </form>
        )}
      </div>
      <p className="text-xs text-slate-400 print:hidden">Printed {d.printCount} time(s). Reprints are auditable.</p>
    </div>
  );
}
