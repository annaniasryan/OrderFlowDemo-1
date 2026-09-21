import Link from "next/link";
import { requireView } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui";
import { canManage } from "@/lib/rbac";

export default async function DistributorsPage() {
  const user = await requireView("distributors");
  const manage = canManage(user.role, "distributors");

  const where =
    user.role === "ACCOUNT_EXECUTIVE" ? { assignedAeId: user.id } : {};

  const distributors = await prisma.distributor.findMany({
    where,
    include: { assignedAe: true, _count: { select: { purchaseOrders: true } } },
    orderBy: { companyName: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Distributor Management"
        description="Customer/distributor reference data used by PO, shipment and reporting."
        actions={
          manage ? (
            <Link href="/distributors/new" className="btn-primary">
              + Add distributor
            </Link>
          ) : undefined
        }
      />
      <div className="card overflow-x-auto">
        {distributors.length === 0 ? (
          <EmptyState message="No distributors yet." />
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Code</th>
                <th>Company</th>
                <th>Assigned AE</th>
                <th>Region / City</th>
                <th>POs</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {distributors.map((d) => (
                <tr key={d.id}>
                  <td className="font-mono text-xs">{d.code}</td>
                  <td className="font-medium text-slate-900">{d.companyName}</td>
                  <td>{d.assignedAe?.fullName ?? "—"}</td>
                  <td>
                    {d.city ?? "—"}
                    {d.region ? `, ${d.region}` : ""}
                  </td>
                  <td>{d._count.purchaseOrders}</td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td>
                    <Link href={`/distributors/${d.id}`} className="text-xs font-medium text-brand-600 hover:underline">
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
