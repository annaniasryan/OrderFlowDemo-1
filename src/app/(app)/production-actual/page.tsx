import Link from "next/link";
import { requireView } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState, StatusBadge, fmtDate, fmtNum } from "@/components/ui";

export default async function ProductionActualPage() {
  await requireView("production_actual");

  const actuals = await prisma.productionActual.findMany({
    include: { product: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const pending = actuals.filter((a) => a.status !== "COMPLETED");
  const completed = actuals.filter((a) => a.status === "COMPLETED");

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          title="Production Actual"
          description="What production actually produced against PPIC's schedule."
        />
        <div className="card overflow-x-auto">
          {pending.length === 0 ? (
            <EmptyState message="No in-progress production." />
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((a) => (
                  <tr key={a.id}>
                    <td>{fmtDate(a.productionDate)}</td>
                    <td className="font-medium text-slate-900">{a.product.productName}</td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                    <td>
                      <Link href={`/production-actual/${a.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                        Enter actual
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Completed Production History</h2>
        <div className="card overflow-x-auto">
          {completed.length === 0 ? (
            <EmptyState message="No completed production yet." />
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Batch</th>
                  <th>Actual</th>
                  <th>Reject</th>
                  <th>Good Output</th>
                  <th>Received?</th>
                </tr>
              </thead>
              <tbody>
                {completed.map((a) => (
                  <tr key={a.id}>
                    <td>{fmtDate(a.productionDate)}</td>
                    <td>{a.product.productName}</td>
                    <td>{a.batch ?? "—"}</td>
                    <td>{fmtNum(a.actualCtn)}</td>
                    <td>{fmtNum(a.rejectCtn)}</td>
                    <td className="font-medium">{fmtNum(a.goodOutputCtn)}</td>
                    <td>{a.receivedToWarehouse ? "Yes" : "Pending"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
