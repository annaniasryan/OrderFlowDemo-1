import Link from "next/link";
import { requireView } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState, fmtDate, fmtNum } from "@/components/ui";

export default async function ProductionRequirementPage() {
  await requireView("production_requirement");

  const requirements = await prisma.productionRequirement.findMany({
    include: { product: true, shipment: { include: { po: true, distributor: true } } },
    orderBy: { requiredBy: "asc" },
  });

  const shortages = requirements.filter((r) => r.needProductionCtn > 0);

  return (
    <div>
      <PageHeader
        title="Production Requirement"
        description="Need Production = max(PO Requirement − Available FG, 0), calculated per confirmed shipment."
      />
      <div className="card overflow-x-auto">
        {requirements.length === 0 ? (
          <EmptyState message="No production requirements yet — confirm a shipment date to generate them." />
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>PO / Shipment</th>
                <th>SKU</th>
                <th>PO Requirement</th>
                <th>Available FG</th>
                <th>Need Production</th>
                <th>Required By</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-xs">{r.shipment.po.poNumber}</td>
                  <td>{r.product.sku}</td>
                  <td>{fmtNum(r.poRequirementCtn)}</td>
                  <td>{fmtNum(r.availableFgCtn)}</td>
                  <td className={r.needProductionCtn > 0 ? "font-semibold text-amber-600" : "text-emerald-600"}>
                    {fmtNum(r.needProductionCtn)}
                  </td>
                  <td>{fmtDate(r.requiredBy)}</td>
                  <td>
                    <Link href={`/production-requirement/${r.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-400">{shortages.length} of {requirements.length} lines need production.</p>
    </div>
  );
}
