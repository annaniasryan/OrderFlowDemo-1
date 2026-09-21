import Link from "next/link";
import { requireView } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState, StatusBadge, fmtNum, fmtDate } from "@/components/ui";
import type { AvailabilityStatus } from "@prisma/client";

export default async function MaterialAvailabilityPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  await requireView("material_availability");

  const rows = await prisma.materialAvailability.findMany({
    where: searchParams.status ? { status: searchParams.status as AvailabilityStatus } : {},
    include: {
      rawMaterial: true,
      productionRequirement: { include: { product: true, shipment: { include: { po: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Material Availability"
        description="Whether production requirements can be supported by available or incoming raw materials."
      />

      <div className="mb-3 flex gap-3 text-xs">
        <Link href="/material-availability" className={!searchParams.status ? "font-semibold text-brand-700" : "text-slate-400"}>
          All
        </Link>
        <Link href="/material-availability?status=INSUFFICIENT" className={searchParams.status === "INSUFFICIENT" ? "font-semibold text-brand-700" : "text-slate-400"}>
          Shortage
        </Link>
        <Link href="/material-availability?status=INCOMING" className={searchParams.status === "INCOMING" ? "font-semibold text-brand-700" : "text-slate-400"}>
          Incoming
        </Link>
        <Link href="/material-availability?status=AVAILABLE" className={searchParams.status === "AVAILABLE" ? "font-semibold text-brand-700" : "text-slate-400"}>
          Available
        </Link>
      </div>

      <div className="card overflow-x-auto">
        {rows.length === 0 ? (
          <EmptyState message="No material availability checks yet." />
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>PO</th>
                <th>Product</th>
                <th>Raw Material</th>
                <th>Required</th>
                <th>Available</th>
                <th>Incoming</th>
                <th>Expected</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-xs">{r.productionRequirement.shipment.po.poNumber}</td>
                  <td>{r.productionRequirement.product.sku}</td>
                  <td>{r.rawMaterial.name}</td>
                  <td>{fmtNum(r.requiredQty, 2)}</td>
                  <td>{fmtNum(r.currentAvailable, 2)}</td>
                  <td>{fmtNum(r.incomingQty, 2)}</td>
                  <td>{fmtDate(r.expectedAvailabilityDate)}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>
                    <Link href={`/production-requirement/${r.productionRequirementId}`} className="text-xs font-medium text-brand-600 hover:underline">
                      Detail
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
