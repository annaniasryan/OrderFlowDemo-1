import { notFound } from "next/navigation";
import Link from "next/link";
import { requireView } from "@/lib/guard";
import { canManage } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, fmtDate, fmtNum } from "@/components/ui";
import { shipmentCbm, shipmentGrossWeight } from "@/lib/calc";
import { markShipmentReady } from "../actions";

export default async function CubicationDetailPage({ params }: { params: { id: string } }) {
  const user = await requireView("shipment_cubication");
  const manage = canManage(user.role, "shipment_cubication");

  const s = await prisma.shipment.findUnique({
    where: { id: params.id },
    include: {
      distributor: true,
      po: true,
      items: { include: { product: true } },
      deliveryOrder: true,
    },
  });
  if (!s) notFound();

  const cbm = shipmentCbm(s.items.map((i) => ({ qtyCtn: i.qtyCtn, cbmPerCtn: i.product.cbmPerCtn })));
  const weight = shipmentGrossWeight(s.items.map((i) => ({ qtyCtn: i.qtyCtn, grossWeightKg: i.product.grossWeightKg })));
  const totalCtn = s.items.reduce((sum, i) => sum + i.qtyCtn, 0);

  async function readyAction() {
    "use server";
    await markShipmentReady(params.id);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={`${s.po.poNumber} — Cubication`}
        description={`${s.distributor.companyName} · ${s.distributor.shippingAddress}`}
        actions={<StatusBadge status={s.status} />}
      />

      <div className="card space-y-4 p-6">
        <table className="table-base">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>CTN</th>
              <th>CBM/CTN</th>
              <th>Weight/CTN</th>
            </tr>
          </thead>
          <tbody>
            {s.items.map((it) => (
              <tr key={it.id}>
                <td className="font-mono text-xs">{it.product.sku}</td>
                <td>{it.product.productName}</td>
                <td>{fmtNum(it.qtyCtn)}</td>
                <td>{fmtNum(it.product.cbmPerCtn, 4)}</td>
                <td>{fmtNum(it.product.grossWeightKg, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase text-slate-400">Total CTN</p>
            <p className="font-semibold">{fmtNum(totalCtn)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Total CBM</p>
            <p className="font-semibold">{fmtNum(cbm, 3)} m³</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Total Gross Weight</p>
            <p className="font-semibold">{fmtNum(weight, 1)} kg</p>
          </div>
        </div>
      </div>

      {manage && (
        <div className="card flex flex-wrap gap-2 p-6">
          {s.status === "CONFIRMED" && (
            <form action={readyAction}>
              <button type="submit" className="btn-primary">
                Mark ready for shipment
              </button>
            </form>
          )}
          {s.status === "READY" && !s.deliveryOrder && (
            <Link href={`/delivery-orders/new?shipmentId=${s.id}`} className="btn-primary">
              Generate Delivery Order
            </Link>
          )}
          {s.deliveryOrder && (
            <Link href={`/delivery-orders/${s.deliveryOrder.id}`} className="btn-secondary">
              View Delivery Order
            </Link>
          )}
        </div>
      )}

      <p className="text-xs text-slate-400">
        Staff manually decides delivery arrangement and whether several POs/customers share a truck — no armada
        master, route planning or vendor quotation is required here.
      </p>
    </div>
  );
}
