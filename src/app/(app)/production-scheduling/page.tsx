import Link from "next/link";
import { requireView } from "@/lib/guard";
import { canManage } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState, StatusBadge, fmtDate, fmtNum } from "@/components/ui";

export default async function ProductionSchedulingPage() {
  const user = await requireView("production_scheduling");
  const manage = canManage(user.role, "production_scheduling");

  const schedules = await prisma.productionSchedule.findMany({
    include: { product: true },
    orderBy: { productionDate: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Production Scheduling"
        description="Executable production plans based on shipment deadline, production need and material readiness."
        actions={
          manage ? (
            <Link href="/production-scheduling/new" className="btn-primary">
              + Create schedule
            </Link>
          ) : undefined
        }
      />
      <div className="card overflow-x-auto">
        {schedules.length === 0 ? (
          <EmptyState message="No production schedules yet." />
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Planned CTN</th>
                <th>Line</th>
                <th>Shift</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td>{fmtDate(s.productionDate)}</td>
                  <td className="font-medium text-slate-900">{s.product.productName}</td>
                  <td>{fmtNum(s.plannedCtn)}</td>
                  <td>{s.line}</td>
                  <td>{s.shift}</td>
                  <td>
                    <StatusBadge status={s.status} />
                  </td>
                  <td>
                    <Link href={`/production-scheduling/${s.id}`} className="text-xs font-medium text-brand-600 hover:underline">
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
