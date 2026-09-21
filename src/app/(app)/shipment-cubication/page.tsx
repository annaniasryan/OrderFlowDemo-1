import Link from "next/link";
import { requireView } from "@/lib/guard";
import { canManage } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState, StatusBadge, fmtDate, fmtNum } from "@/components/ui";
import { shipmentCbm, shipmentGrossWeight } from "@/lib/calc";

export default async function ShipmentCubicationPage() {
  await requireView("shipment_cubication");

  const shipments = await prisma.shipment.findMany({
    where: { status: { in: ["CONFIRMED", "READY", "SHIPPED"] } },
    include: { distributor: true, po: true, items: { include: { product: true } } },
    orderBy: { confirmedShippingDate: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Shipment & Cubication"
        description="Physical shipment information Shipment Division needs to arrange delivery manually. No route planning or truck assignment is done here."
      />
      <div className="card overflow-x-auto">
        {shipments.length === 0 ? (
          <EmptyState message="No confirmed shipments yet." />
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>PO</th>
                <th>Distributor</th>
                <th>Ship Date</th>
                <th>Total CTN</th>
                <th>Total CBM</th>
                <th>Gross Weight</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => {
                const totalCtn = s.items.reduce((sum, i) => sum + i.qtyCtn, 0);
                const cbm = shipmentCbm(s.items.map((i) => ({ qtyCtn: i.qtyCtn, cbmPerCtn: i.product.cbmPerCtn })));
                const weight = shipmentGrossWeight(s.items.map((i) => ({ qtyCtn: i.qtyCtn, grossWeightKg: i.product.grossWeightKg })));
                return (
                  <tr key={s.id}>
                    <td className="font-mono text-xs">{s.po.poNumber}</td>
                    <td>{s.distributor.companyName}</td>
                    <td>{fmtDate(s.confirmedShippingDate)}</td>
                    <td>{fmtNum(totalCtn)}</td>
                    <td>{fmtNum(cbm, 3)} m³</td>
                    <td>{fmtNum(weight, 1)} kg</td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td>
                      <Link href={`/shipment-cubication/${s.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
