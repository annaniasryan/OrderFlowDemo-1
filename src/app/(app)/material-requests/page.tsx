import Link from "next/link";
import { requireView } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState, StatusBadge, fmtDate, fmtNum } from "@/components/ui";

export default async function MaterialRequestsPage() {
  const user = await requireView("material_request");

  const requests = await prisma.materialRequest.findMany({
    include: { rawMaterial: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Material Request & Purchasing"
        description="Request replenishment and expose procurement availability to PPIC without managing supplier POs inside OrderFlow."
        actions={
          user.role === "RAW_MATERIAL_WAREHOUSE" || user.role === "SUPER_ADMIN" ? (
            <Link href="/material-requests/new" className="btn-primary">
              + Create request
            </Link>
          ) : undefined
        }
      />
      <div className="card overflow-x-auto">
        {requests.length === 0 ? (
          <EmptyState message="No material requests yet." />
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Request #</th>
                <th>Material</th>
                <th>Requested Qty</th>
                <th>Required Date</th>
                <th>Incoming Qty</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-xs">{r.requestNumber}</td>
                  <td>{r.rawMaterial.name}</td>
                  <td>{fmtNum(r.requestedQty, 2)}</td>
                  <td>{fmtDate(r.requiredDate)}</td>
                  <td>{r.incomingQty ? fmtNum(r.incomingQty, 2) : "—"}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>
                    <Link href={`/material-requests/${r.id}`} className="text-xs font-medium text-brand-600 hover:underline">
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
