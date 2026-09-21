import Link from "next/link";
import { requireView } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, EmptyState, fmtDate, fmtNum } from "@/components/ui";

export default async function ShipmentSchedulePage() {
  await requireView("shipment_schedule");

  const shipments = await prisma.shipment.findMany({
    include: { distributor: true, po: true, items: true },
    orderBy: { requestedShippingDate: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Shipment Schedule"
        description="Confirm the shipment date for an accepted PO and provide PPIC with the production deadline. One PO = one shipment."
      />
      <div className="card overflow-x-auto">
        {shipments.length === 0 ? (
          <EmptyState message="No shipments yet — accept a PO to generate one." />
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>PO</th>
                <th>Distributor</th>
                <th>Total CTN</th>
                <th>Requested</th>
                <th>Confirmed</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id}>
                  <td className="font-mono text-xs">{s.po.poNumber}</td>
                  <td>{s.distributor.companyName}</td>
                  <td>{fmtNum(s.items.reduce((sum, i) => sum + i.qtyCtn, 0))}</td>
                  <td>{fmtDate(s.requestedShippingDate)}</td>
                  <td>{fmtDate(s.confirmedShippingDate)}</td>
                  <td>
                    <StatusBadge status={s.status} />
                  </td>
                  <td>
                    <Link href={`/shipment-schedule/${s.id}`} className="text-xs font-medium text-brand-600 hover:underline">
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
