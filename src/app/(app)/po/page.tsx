import Link from "next/link";
import { requireView } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, EmptyState, fmtDate } from "@/components/ui";
import { canManage } from "@/lib/rbac";
import type { Prisma } from "@prisma/client";

export default async function POPage() {
  const user = await requireView("po");
  const manage = canManage(user.role, "po");

  let where: Prisma.PurchaseOrderWhereInput = {};
  if (user.role === "DISTRIBUTOR" && user.distributorId) {
    where = { distributorId: user.distributorId };
  } else if (user.role === "ACCOUNT_EXECUTIVE") {
    where = { distributor: { assignedAeId: user.id } };
  }

  const pos = await prisma.purchaseOrder.findMany({
    where,
    include: { distributor: true, items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Purchase Order"
        description="Distributor demand captured with a deliberately simple one-PO-one-shipment model."
        actions={
          manage ? (
            <Link href="/po/new" className="btn-primary">
              + Create PO
            </Link>
          ) : undefined
        }
      />
      <div className="card overflow-x-auto">
        {pos.length === 0 ? (
          <EmptyState message="No purchase orders yet." />
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Distributor</th>
                <th>Lines</th>
                <th>Total CTN</th>
                <th>Requested Ship Date</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pos.map((po) => (
                <tr key={po.id}>
                  <td className="font-mono text-xs">{po.poNumber}</td>
                  <td className="font-medium text-slate-900">{po.distributor.companyName}</td>
                  <td>{po.items.length}</td>
                  <td>{po.items.reduce((s, i) => s + i.qtyCtn, 0)}</td>
                  <td>{fmtDate(po.requestedShippingDate)}</td>
                  <td>
                    <StatusBadge status={po.status} />
                  </td>
                  <td>
                    <Link href={`/po/${po.id}`} className="text-xs font-medium text-brand-600 hover:underline">
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
