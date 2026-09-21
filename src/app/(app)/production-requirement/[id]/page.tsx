import { notFound } from "next/navigation";
import Link from "next/link";
import { requireView } from "@/lib/guard";
import { canManage } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, fmtDate, fmtNum, StatusBadge } from "@/components/ui";
import { refreshRequirement } from "../actions";
import { generateMaterialAvailability } from "../../material-availability/actions";

export default async function RequirementDetailPage({ params }: { params: { id: string } }) {
  const user = await requireView("production_requirement");
  const manage = canManage(user.role, "production_requirement");

  const req = await prisma.productionRequirement.findUnique({
    where: { id: params.id },
    include: {
      product: true,
      shipment: { include: { po: true, distributor: true } },
      materialAvailability: { include: { rawMaterial: true } },
    },
  });
  if (!req) notFound();

  async function refreshAction() {
    "use server";
    await refreshRequirement(params.id);
  }
  async function checkMaterialsAction() {
    "use server";
    await generateMaterialAvailability(params.id);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={req.product.productName}
        description={`${req.shipment.po.poNumber} — ${req.shipment.distributor.companyName}`}
      />

      <div className="card grid grid-cols-2 gap-4 p-6 text-sm">
        <div>
          <p className="text-xs uppercase text-slate-400">PO Requirement</p>
          <p className="font-medium">{fmtNum(req.poRequirementCtn)} CTN</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">Available FG</p>
          <p className="font-medium">{fmtNum(req.availableFgCtn)} CTN</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">Need Production</p>
          <p className="font-semibold text-amber-600">{fmtNum(req.needProductionCtn)} CTN</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">Required By</p>
          <p className="font-medium">{fmtDate(req.requiredBy)}</p>
        </div>
      </div>

      {manage && (
        <div className="card flex flex-wrap gap-2 p-6">
          <form action={refreshAction}>
            <button type="submit" className="btn-secondary">
              Refresh against current FG stock
            </button>
          </form>
          <form action={checkMaterialsAction}>
            <button type="submit" className="btn-secondary">
              Check raw material availability
            </button>
          </form>
          <Link href={`/production-scheduling/new?requirementId=${req.id}`} className="btn-primary">
            Create production schedule
          </Link>
        </div>
      )}

      <div className="card p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Material Availability</h2>
        {req.materialAvailability.length === 0 ? (
          <p className="text-sm text-slate-400">
            Not checked yet, or no BOM configured for this product.
          </p>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Raw Material</th>
                <th>Required</th>
                <th>Available</th>
                <th>Incoming</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {req.materialAvailability.map((m) => (
                <tr key={m.id}>
                  <td>{m.rawMaterial.name}</td>
                  <td>{fmtNum(m.requiredQty, 2)} {m.rawMaterial.unit}</td>
                  <td>{fmtNum(m.currentAvailable, 2)}</td>
                  <td>{fmtNum(m.incomingQty, 2)}</td>
                  <td>
                    <StatusBadge status={m.status} />
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
