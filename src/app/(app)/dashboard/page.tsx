import { requireView } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { PageHeader, KpiCard, fmtDate, fmtNum } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/rbac";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await requireView("dashboard");

  const [poOpenCount, shipmentUpcoming, prodPendingActuals, doCount] = await Promise.all([
    prisma.purchaseOrder.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.shipment.findMany({
      where: { status: { in: ["CONFIRMED", "READY"] } },
      include: { distributor: true, po: true },
      orderBy: { confirmedShippingDate: "asc" },
      take: 6,
    }),
    prisma.productionSchedule.findMany({
      where: { status: { in: ["PLANNED", "SCHEDULED", "IN_PRODUCTION"] } },
      include: { product: true },
      orderBy: { productionDate: "asc" },
      take: 6,
    }),
    prisma.deliveryOrder.count(),
  ]);

  let scopedTitle = "Overview";
  let myPoCount: number | null = null;
  if (user.role === "DISTRIBUTOR" && user.distributorId) {
    myPoCount = await prisma.purchaseOrder.count({ where: { distributorId: user.distributorId } });
    scopedTitle = "Your orders";
  } else if (user.role === "ACCOUNT_EXECUTIVE") {
    myPoCount = await prisma.purchaseOrder.count({
      where: { distributor: { assignedAeId: user.id } },
    });
    scopedTitle = "Your assigned accounts";
  }

  const shortages = await prisma.materialAvailability.count({ where: { status: "INSUFFICIENT" } });
  const rmLow = await prisma.rawMaterial.findMany({
    where: { status: "ACTIVE" },
    take: 50,
  });

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user.fullName.split(" ")[0]}`}
        description={`${ROLE_LABELS[user.role]} · ${scopedTitle}`}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Open POs (awaiting review)" value={poOpenCount} />
        <KpiCard label="Upcoming Shipments" value={shipmentUpcoming.length} />
        <KpiCard label="Pending / Active Schedules" value={prodPendingActuals.length} />
        <KpiCard label="Delivery Orders Issued" value={doCount} />
        {myPoCount !== null && <KpiCard label="Your Purchase Orders" value={myPoCount} />}
        {(user.role === "PPIC" || user.role === "SUPER_ADMIN" || user.role === "EXECUTIVE_VIEWER") && (
          <KpiCard label="Material Shortages" value={shortages} hint="Insufficient raw material vs requirement" />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Upcoming Shipments</h2>
          {shipmentUpcoming.length === 0 && (
            <p className="text-sm text-slate-400">Nothing scheduled yet.</p>
          )}
          <ul className="divide-y divide-slate-100">
            {shipmentUpcoming.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{s.po.poNumber}</p>
                  <p className="text-xs text-slate-400">{s.distributor.companyName}</p>
                </div>
                <span className="text-xs text-slate-500">
                  {fmtDate(s.confirmedShippingDate ?? s.requestedShippingDate)}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/shipment-schedule" className="mt-3 inline-block text-xs font-medium text-brand-600 hover:underline">
            View shipment schedule →
          </Link>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Production Schedule</h2>
          {prodPendingActuals.length === 0 && (
            <p className="text-sm text-slate-400">No active schedules.</p>
          )}
          <ul className="divide-y divide-slate-100">
            {prodPendingActuals.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{p.product.productName}</p>
                  <p className="text-xs text-slate-400">
                    {fmtNum(p.plannedCtn)} CTN · {p.line} · {p.shift}
                  </p>
                </div>
                <span className="text-xs text-slate-500">{fmtDate(p.productionDate)}</span>
              </li>
            ))}
          </ul>
          <Link href="/production-scheduling" className="mt-3 inline-block text-xs font-medium text-brand-600 hover:underline">
            View production schedule →
          </Link>
        </div>
      </div>

      {rmLow.length > 0 && (user.role === "PPIC" || user.role === "RAW_MATERIAL_WAREHOUSE" || user.role === "SUPER_ADMIN") && (
        <p className="mt-6 text-xs text-slate-400">
          Internal operational detail is scoped to your role. Distributor accounts never see production,
          material or warehouse information — only their own PO and permitted shipment status.
        </p>
      )}
    </div>
  );
}
