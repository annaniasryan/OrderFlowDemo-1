import Link from "next/link";
import { requireView } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, EmptyState, fmtDate } from "@/components/ui";
import type { Prisma } from "@prisma/client";

export default async function PORevisionsPage() {
  const user = await requireView("po_revision");

  let where: Prisma.PORevisionWhereInput = {};
  if (user.role === "DISTRIBUTOR" && user.distributorId) {
    where = { po: { distributorId: user.distributorId } };
  } else if (user.role === "ACCOUNT_EXECUTIVE") {
    where = { po: { distributor: { assignedAeId: user.id } } };
  }

  const revisions = await prisma.pORevision.findMany({
    where,
    include: { po: { include: { distributor: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="PO Revision"
        description="Distributor-requested PO changes handled through the Account Executive."
      />
      <div className="card overflow-x-auto">
        {revisions.length === 0 ? (
          <EmptyState message="No revision requests yet." />
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>PO</th>
                <th>Distributor</th>
                <th>Version</th>
                <th>Requested</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {revisions.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-xs">{r.po.poNumber}</td>
                  <td>{r.po.distributor.companyName}</td>
                  <td>V{r.version}</td>
                  <td>{fmtDate(r.createdAt)}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>
                    <Link href={`/po-revisions/${r.id}`} className="text-xs font-medium text-brand-600 hover:underline">
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
