import Link from "next/link";
import { requireView } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState, StatusBadge, fmtDate, fmtNum } from "@/components/ui";

export default async function DeliveryOrdersPage() {
  await requireView("delivery_order");

  const dos = await prisma.deliveryOrder.findMany({
    include: { shipment: { include: { distributor: true, po: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Delivery Order"
        description="The official shipment document accompanying the goods. One traceable DO per PO/shipment; no pricing, no PCS column."
      />
      <div className="card overflow-x-auto">
        {dos.length === 0 ? (
          <EmptyState message="No delivery orders yet." />
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>DO Number</th>
                <th>PO</th>
                <th>Distributor</th>
                <th>Ship Date</th>
                <th>Total CTN</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dos.map((d) => (
                <tr key={d.id}>
                  <td className="font-mono text-xs">{d.doNumber}</td>
                  <td className="font-mono text-xs">{d.shipment.po.poNumber}</td>
                  <td>{d.shipment.distributor.companyName}</td>
                  <td>{fmtDate(d.shipmentDate)}</td>
                  <td>{fmtNum(d.totalCtn)}</td>
                  <td>
                    <StatusBadge status={d.shipment.status} />
                  </td>
                  <td>
                    <Link href={`/delivery-orders/${d.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
